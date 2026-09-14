from time import monotonic
from pathlib import Path
from tempfile import TemporaryDirectory

from celery.utils.log import get_task_logger

from ingestion.celery_app import celery_app
from ingestion.db import connect_db
from ingestion.jobs import advance_job_stage, claim_job, complete_job, fail_job
from ingestion.source import SourceError, verify_source


logger = get_task_logger(__name__)


@celery_app.task(
    name="ingestion.verify_source",
    acks_late=True,
)
def verify_source_task(
    ingestion_job_id: str,
    schema_version: int = 1,
):
    started = monotonic()
    logger.info(
        "job_received job=%s schema_version=%s",
        ingestion_job_id, schema_version,
    )
    try:
        return _run_source_verification(ingestion_job_id, schema_version, started)
    except Exception as error:
        # Preserve exception behavior without adding sensitive exception text.
        logger.error(
            "job_execution_error job=%s error_type=%s elapsed_ms=%d "
            "action=inspect_job_state_and_recovery_logs",
            ingestion_job_id, type(error).__name__,
            int((monotonic() - started) * 1000),
        )
        raise


def _run_source_verification(ingestion_job_id, schema_version, started):
    if schema_version != 1:
        raise ValueError("Unsupported ingestion message version")

    claimed = claim_job(ingestion_job_id)

    if claimed is None:
        logger.info(
            "job_claim_skipped job=%s reason=missing_or_ineligible "
            "action=no_processing",
            ingestion_job_id,
        )
        return

    claim_token = claimed["claim_token"]
    logger.info(
        "job_claimed job=%s version=%s attempt=%s/%s pipeline=%s "
        "stage=SOURCE_ACCESS lease_expires_at=%s",
        ingestion_job_id, claimed["document_version_id"],
        claimed["attempt_count"], claimed["max_attempts"],
        claimed["pipeline_version"], claimed["lease_expires_at"],
    )

    with connect_db() as connection:
        source = connection.execute(
            """
            SELECT v.storage_key, v.file_size, v.file_hash
            FROM ingestion_jobs j
            JOIN document_versions v
              ON v.id = j.document_version_id
            JOIN documents d
              ON d.id = v.document_id
            WHERE j.id = %s
              AND j.status = 'RUNNING'
              AND j.claim_token = %s
              AND j.lease_expires_at > clock_timestamp()
            """,
            (ingestion_job_id, claim_token),
        ).fetchone()

    if source is None:
        logger.info(
            "source_lookup_skipped job=%s reason=missing_or_ownership_lost",
            ingestion_job_id,
        )
        return

    stage = "SOURCE_ACCESS"
    try:
        with TemporaryDirectory(prefix="ingestion-") as temp_directory:
            pdf_path = Path(temp_directory) / "source.pdf"

            with pdf_path.open("wb") as destination:
                verify_source(
                    source,
                    job_id=ingestion_job_id,
                    destination=destination,
                )

            logger.info(
                "source_file_ready job=%s bytes=%s",
                ingestion_job_id,
                source["file_size"],
            )

            if not advance_job_stage(ingestion_job_id, claim_token, "PARSING"):
                logger.warning("stage_update_rejected job=%s stage=PARSING", ingestion_job_id)
                return
            stage = "PARSING"
            stage_started = monotonic()
            logger.info("parsing_started job=%s", ingestion_job_id)
            from ingestion.pdf_parser import (
                extract_pdf, estimate_body_font_size,
                mark_heading_candidates, build_text_units,
            )

            parsed = extract_pdf(pdf_path)
            body_size = estimate_body_font_size(parsed.blocks)
            mark_heading_candidates(parsed.blocks, body_size)
            if not parsed.blocks:
                raise SourceError("PDF_NO_TEXT", "PDF has no extractable text; OCR is not implemented", False)
            heading_count = sum(
                line.is_heading_candidate
                for block in parsed.blocks for line in block.lines
            )
            logger.info(
                "parsing_completed job=%s pages=%s blocks=%s headings=%s "
                "pages_without_text=%s elapsed_ms=%d",
                ingestion_job_id, parsed.page_count, len(parsed.blocks),
                heading_count, len(parsed.pages_without_text),
                int((monotonic() - stage_started) * 1000),
            )

            if not advance_job_stage(ingestion_job_id, claim_token, "CHUNKING"):
                logger.warning("stage_update_rejected job=%s stage=CHUNKING", ingestion_job_id)
                return
            stage = "CHUNKING"
            stage_started = monotonic()
            logger.info("chunking_started job=%s", ingestion_job_id)
            from ingestion.chunker import chunk_units

            units = build_text_units(parsed.blocks)
            chunks = chunk_units(units, target_tokens=512, max_tokens=768)
            if not chunks:
                raise SourceError("NO_CHUNKS", "Extracted text produced no chunks", False)
            logger.info(
                "chunking_completed job=%s units=%s chunks=%s tokens=%s "
                "elapsed_ms=%d persisted=pending",
                ingestion_job_id, len(units), len(chunks),
                sum(chunk.token_count for chunk in chunks),
                int((monotonic() - stage_started) * 1000),
            )
            from ingestion.chunk_store import store_chunks
            if not store_chunks(ingestion_job_id, claim_token, chunks):
                raise SourceError("CHUNK_STORE_OWNERSHIP_LOST", "Worker no longer owns job", False)
            logger.info("chunks_persisted job=%s chunks=%s", ingestion_job_id, len(chunks))
            if not advance_job_stage(ingestion_job_id, claim_token, "EMBEDDING"):
                raise SourceError("EMBEDDING_OWNERSHIP_LOST", "Worker no longer owns job", False)
            stage = "EMBEDDING"
            logger.info("embedding_started job=%s chunks=%s", ingestion_job_id, len(chunks))
            from ingestion.embedding import embed_texts
            from ingestion.chunk_store import store_embeddings
            vectors = embed_texts([chunk.text for chunk in chunks])
            if not store_embeddings(ingestion_job_id, claim_token, vectors):
                raise SourceError("EMBEDDING_STORE_FAILED", "Could not save embeddings", True)
            logger.info("embedding_completed job=%s vectors=%s", ingestion_job_id, len(vectors))
    except Exception as caught:
        if isinstance(caught, SourceError):
            error = caught
        else:
            error = SourceError(
                f"{stage}_ERROR",
                f"{stage} failed ({type(caught).__name__})",
                not (stage == "PARSING" and isinstance(caught, ValueError)),
            )
        logger.warning(
            "ingestion_failed job=%s stage=%s code=%s "
            "retryable=%s attempt=%s/%s elapsed_ms=%d",
            ingestion_job_id, stage, error.code, error.retryable,
            claimed["attempt_count"], claimed["max_attempts"],
            int((monotonic() - started) * 1000),
        )
        outcome = fail_job(
            ingestion_job_id,
            claim_token,
            error_code=error.code,
            error_message=str(error),
            retryable=error.retryable,
        )

        if outcome is None:
            logger.warning("job_failure_update_rejected job=%s reason=ownership_lost", ingestion_job_id)
        elif outcome["status"] == "RETRY_WAIT":
            logger.warning(
                "job_retry_scheduled job=%s attempt=%s/%s next_attempt_at=%s "
                "outbox=pending",
                ingestion_job_id, outcome["attempt_count"], claimed["max_attempts"],
                outcome["next_attempt_at"],
            )
        else:
            logger.error(
                "job_failed_terminal job=%s code=%s attempt=%s/%s",
                ingestion_job_id, error.code,
                outcome["attempt_count"], claimed["max_attempts"],
            )
        return

    if complete_job(ingestion_job_id, claim_token):
        logger.info(
            "job_succeeded job=%s stage=CHUNKING attempt=%s/%s "
            "elapsed_ms=%d document_ready=false",
            ingestion_job_id, claimed["attempt_count"], claimed["max_attempts"],
            int((monotonic() - started) * 1000),
        )
    else:
        logger.warning(
            "job_completion_rejected job=%s reason=ownership_lost",
            ingestion_job_id,
        )
