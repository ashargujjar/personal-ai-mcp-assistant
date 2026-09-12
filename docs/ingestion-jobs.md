# Ingestion jobs and the outbox

New uploads now commit four related records through a single Prisma nested write:

```text
Document → DocumentVersion → IngestionJob → OutboxEvent
```

The Cloudinary upload happens first and is outside that database transaction. A database failure triggers the existing storage cleanup. Database acceptance does not mean queue delivery or document readiness.

## Job fields

- `documentVersionId` identifies the immutable source revision. Ownership is inherited through the version's document, not supplied by a queue caller.
- `status` starts at `QUEUED`; `stage` starts null. Status values are QUEUED, RUNNING, RETRY_WAIT, SUCCEEDED, FAILED. Stage values are SOURCE_ACCESS, PARSING, CHUNKING, EMBEDDING.
- `pipelineVersion` is explicitly `source-access-v1` for this first implementation. The upcoming worker will only verify access to the source. Its success must not mark the document READY. Future parsing pipelines use new job configurations.
- `parserVersion`, `chunkingVersion`, and `embeddingModel` remain null until an actual processing configuration is selected. Do not change a job's configuration during retries.
- `attemptCount` starts at 0; `maxAttempts` is 3 (one initial attempt plus two retries). A successful worker claim will increment the counter; delivery attempts do not.
- `claimToken`, `leaseExpiresAt`, and `nextAttemptAt` support later worker claiming/recovery. Their presence alone does not implement those guarantees.
- Error fields and timestamps are available for execution reporting. Store sanitized failures, not credentials or extracted content.

## Outbox fields

`ingestionJobId` references the durable job. `eventType` is `ingestion.requested` and `schemaVersion` is 1. The eventual queue message is constructed from these typed fields:

```json
{"schema_version": 1, "ingestion_job_id": "<job id>"}
```

There is no PDF, signed download URL, JWT, or arbitrary JSON payload in this event. The unique `(ingestionJobId, eventType)` pair prevents creating duplicate initial request events; it does not prevent repeated delivery of an event.

`dispatchedAt = null` means delivery has not been recorded. `availableAt`, `dispatchAttemptCount`, `claimToken`, and `leaseExpiresAt` support the future dispatch loop. Dispatch attempts are separate from worker attempts.

## API and deletion behavior

Upload/list responses include `ingestionJobId` and `ingestionStatus` from the most recent job on the latest source version. Existing versions without jobs return null for those fields. Existing versions are not automatically scheduled by this migration.

The existing document `status` stays `uploaded`. It describes current document availability, independently of the job's execution state. Legacy processing fields on Document remain temporarily for compatibility; this upload path writes processing configuration only on the new job.

Deleting version rows cascades to their jobs and outbox events. Queue messages already published cannot be recalled by this cascade: the upcoming dispatcher/worker must tolerate missing jobs. Coordination with running workers must be implemented before enabling background processing.

## Current boundary

Redis, the dispatcher, atomic claims, lease renewal, retries, and the Python worker are not implemented yet. Jobs and events remain pending. Next: add Redis and a Python dispatcher/worker for `source-access-v1`.

## Validation

The integration test in `backend/tests/document-versions.test.ts` checks job/event defaults, relationship IDs, rollback when the final nested outbox insert violates uniqueness, and deletion cleanup. It uses the real development database with isolated test records and mocked Cloudinary calls.
