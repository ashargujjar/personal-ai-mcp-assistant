from time import monotonic

from celery.utils.log import get_task_logger

from ingestion.celery_app import celery_app
from ingestion.db import connect_db
from ingestion.jobs import claim_job, complete_job, fail_job
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

    try:
        verify_source(source, job_id=ingestion_job_id)
    except SourceError as error:
        logger.warning(
            "source_verification_failed job=%s stage=SOURCE_ACCESS code=%s "
            "retryable=%s attempt=%s/%s elapsed_ms=%d",
            ingestion_job_id, error.code, error.retryable,
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
            "job_succeeded job=%s stage=SOURCE_ACCESS attempt=%s/%s "
            "elapsed_ms=%d document_ready=false",
            ingestion_job_id, claimed["attempt_count"], claimed["max_attempts"],
            int((monotonic() - started) * 1000),
        )
    else:
        logger.warning(
            "job_completion_rejected job=%s reason=ownership_lost",
            ingestion_job_id,
        )
