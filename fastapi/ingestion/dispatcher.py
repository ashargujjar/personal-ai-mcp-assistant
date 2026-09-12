import logging
import signal
from threading import Event
from time import monotonic
from uuid import uuid4

from ingestion.celery_app import celery_app
from ingestion.db import connect_db
from ingestion.jobs import recover_expired_jobs


logger = logging.getLogger(__name__)
stop = Event()


CLAIM_EVENT_SQL = """
WITH candidate AS (
    SELECT id
    FROM outbox_events
    WHERE dispatched_at IS NULL
      AND available_at <= clock_timestamp()
      AND event_type = 'ingestion.requested'
      AND schema_version = 1
      AND (
          claim_token IS NULL
          OR lease_expires_at <= clock_timestamp()
      )
    ORDER BY created_at, id
    LIMIT 1
    FOR UPDATE SKIP LOCKED
)
UPDATE outbox_events AS event
SET
    claim_token = %(token)s,
    lease_expires_at =
        clock_timestamp() + INTERVAL '60 seconds',
    dispatch_attempt_count = dispatch_attempt_count + 1
FROM candidate
WHERE event.id = candidate.id
RETURNING
    event.id,
    event.ingestion_job_id,
    event.schema_version,
    event.claim_token,
    event.dispatch_attempt_count;
"""


def claim_event():
    with connect_db() as connection:
        event = connection.execute(
            CLAIM_EVENT_SQL,
            {"token": str(uuid4())},
        ).fetchone()

    return event


def record_dispatch(event) -> bool:
    with connect_db() as connection:
        result = connection.execute(
            """
            UPDATE outbox_events
            SET dispatched_at = clock_timestamp(),
                claim_token = NULL,
                lease_expires_at = NULL,
                last_error_message = NULL
            WHERE id = %s
              AND claim_token = %s
              AND lease_expires_at > clock_timestamp()
              AND dispatched_at IS NULL
            RETURNING id
            """,
            (event["id"], event["claim_token"]),
        ).fetchone()

    return result is not None


def postpone_event(event):
    with connect_db() as connection:
        postponed = connection.execute(
            """
            UPDATE outbox_events
            SET available_at =
                    clock_timestamp() + INTERVAL '15 seconds',
                claim_token = NULL,
                lease_expires_at = NULL,
                last_error_message = 'Broker publication failed'
            WHERE id = %s
              AND claim_token = %s
              AND lease_expires_at > clock_timestamp()
              AND dispatched_at IS NULL
            RETURNING available_at
            """,
            (event["id"], event["claim_token"]),
        ).fetchone()
    return postponed


def dispatch_one() -> bool:
    event = claim_event()

    if event is None:
        return False

    started = monotonic()
    logger.info(
        "outbox_claimed event=%s job=%s dispatch_attempt=%s queue=ingestion",
        event["id"], event["ingestion_job_id"], event["dispatch_attempt_count"],
    )
    try:
        delivery = celery_app.send_task(
            "ingestion.verify_source",
            kwargs={
                "ingestion_job_id": event["ingestion_job_id"],
                "schema_version": event["schema_version"],
            },
            queue="ingestion",
            retry=False,
        )
    except Exception as error:
        # Log the category, not broker URLs or credential-bearing errors.
        logger.warning(
            "outbox_publish_failed event=%s job=%s dispatch_attempt=%s error_type=%s",
            event["id"],
            event["ingestion_job_id"], event["dispatch_attempt_count"],
            type(error).__name__,
        )
        postponed = postpone_event(event)
        if postponed:
            logger.warning(
                "outbox_retry_scheduled event=%s job=%s available_at=%s",
                event["id"], event["ingestion_job_id"], postponed["available_at"],
            )
        else:
            logger.warning(
                "outbox_postpone_skipped event=%s job=%s reason=missing_or_ownership_lost",
                event["id"], event["ingestion_job_id"],
            )
        return True

    logger.info(
        "outbox_published event=%s job=%s celery_task_id=%s elapsed_ms=%d",
        event["id"], event["ingestion_job_id"], delivery.id,
        int((monotonic() - started) * 1000),
    )
    # Keep this outside the publication try/except:
    # a DB failure here does not mean publication failed.
    try:
        recorded = record_dispatch(event)
    except Exception as error:
        logger.error(
            "outbox_dispatch_record_failed event=%s job=%s error_type=%s "
            "publication=already_returned action=allow_event_lease_recovery",
            event["id"], event["ingestion_job_id"], type(error).__name__,
        )
        raise

    if recorded:
        logger.info(
            "outbox_dispatch_recorded event=%s job=%s",
            event["id"],
            event["ingestion_job_id"],
        )
    else:
        logger.warning(
            "outbox_dispatch_record_skipped event=%s reason=missing_or_ownership_lost",
            event["id"],
        )

    return True


def main():
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
    )

    signal.signal(signal.SIGTERM, lambda *_: stop.set())
    signal.signal(signal.SIGINT, lambda *_: stop.set())

    next_recovery_at = 0.0
    next_idle_log_at = monotonic() + 60
    logger.info(
        "dispatcher_started queue=ingestion poll_seconds=1 recovery_seconds=10",
    )

    while not stop.is_set():
        try:
            if monotonic() >= next_recovery_at:
                recovered = recover_expired_jobs()
                for job in recovered:
                    logger.warning(
                        "job_lease_recovered job=%s state=%s attempts_used=%s "
                        "next_attempt_at=%s",
                        job["id"],
                        job["status"],
                        job["attempt_count"],
                        job["next_attempt_at"] if job["status"] == "RETRY_WAIT" else None,
                    )
                next_recovery_at = monotonic() + 10

            found_event = dispatch_one()
        except Exception as error:
            logger.error(
                "Dispatcher iteration failed: error_type=%s",
                type(error).__name__,
            )
            stop.wait(5)
        else:
            if not found_event:
                if monotonic() >= next_idle_log_at:
                    logger.info("dispatcher_waiting reason=no_eligible_outbox_event")
                    next_idle_log_at = monotonic() + 60
                stop.wait(1)

    logger.info("dispatcher_stopped")


if __name__ == "__main__":
    main()
