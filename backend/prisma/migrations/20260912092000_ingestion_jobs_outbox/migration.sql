BEGIN;

CREATE TYPE "IngestionStatus" AS ENUM ('QUEUED', 'RUNNING', 'RETRY_WAIT', 'SUCCEEDED', 'FAILED');
CREATE TYPE "IngestionStage" AS ENUM ('SOURCE_ACCESS', 'PARSING', 'CHUNKING', 'EMBEDDING');

CREATE TABLE "ingestion_jobs" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "document_version_id" TEXT NOT NULL,
  "status" "IngestionStatus" NOT NULL DEFAULT 'QUEUED',
  "stage" "IngestionStage",
  "pipeline_version" TEXT NOT NULL,
  "parser_version" TEXT,
  "chunking_version" TEXT,
  "embedding_model" TEXT,
  "attempt_count" INTEGER NOT NULL DEFAULT 0 CHECK ("attempt_count" >= 0),
  "max_attempts" INTEGER NOT NULL DEFAULT 3 CHECK ("max_attempts" > 0),
  "claim_token" TEXT,
  "lease_expires_at" TIMESTAMP(3),
  "next_attempt_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_error_code" TEXT,
  "last_error_message" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "started_at" TIMESTAMP(3),
  "finished_at" TIMESTAMP(3),
  CONSTRAINT "ingestion_jobs_document_version_id_fkey" FOREIGN KEY ("document_version_id")
    REFERENCES "document_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "outbox_events" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "ingestion_job_id" TEXT NOT NULL,
  "event_type" TEXT NOT NULL DEFAULT 'ingestion.requested',
  "schema_version" INTEGER NOT NULL DEFAULT 1 CHECK ("schema_version" > 0),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "available_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dispatched_at" TIMESTAMP(3),
  "dispatch_attempt_count" INTEGER NOT NULL DEFAULT 0 CHECK ("dispatch_attempt_count" >= 0),
  "claim_token" TEXT,
  "lease_expires_at" TIMESTAMP(3),
  "last_error_message" TEXT,
  CONSTRAINT "outbox_events_ingestion_job_id_fkey" FOREIGN KEY ("ingestion_job_id")
    REFERENCES "ingestion_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "ingestion_jobs_document_version_id_created_at_idx" ON "ingestion_jobs"("document_version_id", "created_at");
CREATE INDEX "ingestion_jobs_status_next_attempt_at_idx" ON "ingestion_jobs"("status", "next_attempt_at");
CREATE INDEX "ingestion_jobs_status_lease_expires_at_idx" ON "ingestion_jobs"("status", "lease_expires_at");
CREATE INDEX "outbox_events_dispatched_at_available_at_idx" ON "outbox_events"("dispatched_at", "available_at");
CREATE UNIQUE INDEX "outbox_events_ingestion_job_id_event_type_key" ON "outbox_events"("ingestion_job_id", "event_type");

-- No automatic processing requests for existing versions: only new uploads opt in.
COMMIT;
