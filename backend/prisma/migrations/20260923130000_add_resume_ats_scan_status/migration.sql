CREATE TYPE "ResumeAtsScanStatus" AS ENUM (
    'NOT_STARTED',
    'QUEUED',
    'SCANNING',
    'COMPLETED',
    'FAILED'
);

ALTER TABLE "resume_searches"
ADD COLUMN "ats_status" "ResumeAtsScanStatus" NOT NULL DEFAULT 'NOT_STARTED',
ADD COLUMN "ats_total" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "ats_processed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "ats_succeeded" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "ats_failed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "ats_error_message" TEXT,
ADD COLUMN "ats_started_at" TIMESTAMP(3),
ADD COLUMN "ats_finished_at" TIMESTAMP(3);
