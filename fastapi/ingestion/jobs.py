from typing import Any
from uuid import uuid4

from ingestion.db import connect_db


CLAIM_JOB_SQL = """
UPDATE ingestion_jobs
SET
    status = 'RUNNING',
    stage = 'SOURCE_ACCESS',
    claim_token = %(claim_token)s,
    lease_expires_at =
        clock_timestamp() + %(lease_seconds)s * INTERVAL '1 second',
    attempt_count = attempt_count + 1,
    started_at = COALESCE(started_at, clock_timestamp()),
    finished_at = NULL,
    updated_at = clock_timestamp()
WHERE id = %(job_id)s
  AND pipeline_version = 'source-access-v1'
  AND status IN ('QUEUED', 'RETRY_WAIT')
  AND next_attempt_at <= clock_timestamp()
  AND attempt_count < max_attempts
RETURNING
    id,
    document_version_id,
    pipeline_version,
    claim_token,
    lease_expires_at,
    attempt_count,
    max_attempts;
"""


def claim_job(
    job_id: str,
    lease_seconds: int = 300,
) -> dict[str, Any] | None:
    if not job_id:
        raise ValueError("job_id is required")

    if lease_seconds <= 0:
        raise ValueError("lease_seconds must be positive")

    parameters = {
        "job_id": job_id,
        "claim_token": str(uuid4()),
        "lease_seconds": lease_seconds,
    }

    with connect_db() as connection:
        claimed_job = connection.execute(
            CLAIM_JOB_SQL,
            parameters,
        ).fetchone()

    return claimed_job

def advance_job_stage(job_id: str, claim_token: str, stage: str) -> bool:
    previous_stage = {
        "PARSING": "SOURCE_ACCESS",
        "METADATA": "PARSING",
        "CHUNKING": "METADATA",
        "EMBEDDING": "CHUNKING",
    }
    if stage not in previous_stage:
        raise ValueError("Unsupported stage transition")

    with connect_db() as connection:
        updated = connection.execute(
            """
            UPDATE ingestion_jobs
            SET stage = %s::"IngestionStage",
                lease_expires_at = clock_timestamp() + INTERVAL '300 seconds',
                updated_at = clock_timestamp()
            WHERE id = %s AND claim_token = %s
              AND status = 'RUNNING'
              AND stage = %s::"IngestionStage"
              AND lease_expires_at > clock_timestamp()
            RETURNING id
            """,
            (stage, job_id, claim_token, previous_stage[stage]),
        ).fetchone()
    return updated is not None


COMPLETE_JOB_SQL = """
UPDATE ingestion_jobs
SET
    status = 'SUCCEEDED',
    finished_at = clock_timestamp(),
    updated_at = clock_timestamp(),
    claim_token = NULL,
    lease_expires_at = NULL,
    last_error_code = NULL,
    last_error_message = NULL
WHERE id = %(job_id)s
  AND status = 'RUNNING'
  AND claim_token = %(claim_token)s
  AND lease_expires_at > clock_timestamp()
RETURNING id;
"""


def complete_job(job_id: str, claim_token: str) -> bool:
    if not job_id or not claim_token:
        raise ValueError("job_id and claim_token are required")

    with connect_db() as connection:
        completed = connection.execute(
            COMPLETE_JOB_SQL,
            {
                "job_id": job_id,
                "claim_token": claim_token,
            },
        ).fetchone()

    return completed is not None

FAIL_JOB_SQL = """
UPDATE ingestion_jobs
SET
    status = CASE
        WHEN %(retryable)s AND attempt_count < max_attempts
            THEN 'RETRY_WAIT'::"IngestionStatus"
        ELSE 'FAILED'::"IngestionStatus"
    END,
    next_attempt_at = CASE
        WHEN %(retryable)s AND attempt_count < max_attempts
            THEN clock_timestamp()
                 + %(retry_delay_seconds)s * INTERVAL '1 second'
        ELSE next_attempt_at
    END,
    finished_at = CASE
        WHEN %(retryable)s AND attempt_count < max_attempts
            THEN NULL
        ELSE clock_timestamp()
    END,
    last_error_code = %(error_code)s,
    last_error_message = %(error_message)s,
    claim_token = NULL,
    lease_expires_at = NULL,
    updated_at = clock_timestamp()
WHERE id = %(job_id)s
  AND status = 'RUNNING'
  AND claim_token = %(claim_token)s
  AND lease_expires_at > clock_timestamp()
RETURNING id, status, attempt_count, next_attempt_at;
"""


REARM_OUTBOX_SQL = """
INSERT INTO outbox_events (
    id,
    ingestion_job_id,
    event_type,
    schema_version,
    available_at
)
VALUES (
    %(event_id)s,
    %(job_id)s,
    'ingestion.requested',
    1,
    %(available_at)s
)
ON CONFLICT (ingestion_job_id, event_type)
DO UPDATE SET
    available_at = EXCLUDED.available_at,
    dispatched_at = NULL,
    claim_token = NULL,
    lease_expires_at = NULL,
    last_error_message = NULL;
"""


def fail_job(
    job_id: str,
    claim_token: str,
    *,
    error_code: str,
    error_message: str,
    retryable: bool,
    retry_delay_seconds: int = 30,
) -> dict[str, Any] | None:
    if not job_id or not claim_token:
        raise ValueError("job_id and claim_token are required")

    if not error_code:
        raise ValueError("error_code is required")

    if retry_delay_seconds < 0:
        raise ValueError("retry_delay_seconds cannot be negative")

    with connect_db() as connection:
        failed = connection.execute(
            FAIL_JOB_SQL,
            {
                "job_id": job_id,
                "claim_token": claim_token,
                "retryable": retryable,
                "retry_delay_seconds": retry_delay_seconds,
                "error_code": error_code[:100],
                "error_message": error_message[:1000],
            },
        ).fetchone()

        if failed is not None and failed["status"] == "RETRY_WAIT":
            connection.execute(
                REARM_OUTBOX_SQL,
                {
                    "event_id": str(uuid4()),
                    "job_id": failed["id"],
                    "available_at": failed["next_attempt_at"],
                },
            )

    return failed


RECOVER_EXPIRED_JOBS_SQL = """
WITH expired AS (
    SELECT id
    FROM ingestion_jobs
    WHERE status = 'RUNNING'
      AND pipeline_version = 'source-access-v1'
      AND lease_expires_at <= clock_timestamp()
    ORDER BY lease_expires_at, id
    LIMIT %(batch_size)s
    FOR UPDATE SKIP LOCKED
)
UPDATE ingestion_jobs AS job
SET
    status = CASE
        WHEN job.attempt_count < job.max_attempts
            THEN 'RETRY_WAIT'::"IngestionStatus"
        ELSE 'FAILED'::"IngestionStatus"
    END,
    next_attempt_at = CASE
        WHEN job.attempt_count < job.max_attempts
            THEN clock_timestamp()
                 + %(retry_delay_seconds)s * INTERVAL '1 second'
        ELSE job.next_attempt_at
    END,
    finished_at = CASE
        WHEN job.attempt_count < job.max_attempts THEN NULL
        ELSE clock_timestamp()
    END,
    claim_token = NULL,
    lease_expires_at = NULL,
    last_error_code = 'LEASE_EXPIRED',
    last_error_message = 'Worker ownership expired before completion',
    updated_at = clock_timestamp()
FROM expired
WHERE job.id = expired.id
RETURNING job.id, job.status, job.attempt_count, job.next_attempt_at;
"""


def recover_expired_jobs(
    batch_size: int = 50,
    retry_delay_seconds: int = 30,
) -> list[dict[str, Any]]:
    if not 1 <= batch_size <= 500:
        raise ValueError("batch_size must be between 1 and 500")

    if retry_delay_seconds < 0:
        raise ValueError("retry_delay_seconds cannot be negative")

    # Recovery and retry delivery intent commit together. Row locks prevent
    # concurrent recovery processes from handling the same expired claim.
    with connect_db() as connection:
        recovered = connection.execute(
            RECOVER_EXPIRED_JOBS_SQL,
            {
                "batch_size": batch_size,
                "retry_delay_seconds": retry_delay_seconds,
            },
        ).fetchall()

        for job in recovered:
            if job["status"] == "RETRY_WAIT":
                connection.execute(
                    REARM_OUTBOX_SQL,
                    {
                        "event_id": str(uuid4()),
                        "job_id": job["id"],
                        "available_at": job["next_attempt_at"],
                    },
                )

    # Attempts are counted by claim_job(), not by recovery.
    return recovered
