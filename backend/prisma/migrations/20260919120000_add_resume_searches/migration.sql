CREATE TYPE "ResumeSearchStatus" AS ENUM (
    'QUEUED',
    'SEARCHING_GMAIL',
    'PROCESSING',
    'COMPLETED',
    'FAILED'
);

CREATE TYPE "ResumeApplicantStatus" AS ENUM (
    'DISCOVERED',
    'DOWNLOADING',
    'UPLOADING',
    'SAVED',
    'FAILED'
);

CREATE TABLE "resume_searches" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "job_title" TEXT NOT NULL,
    "description" TEXT,
    "date_from" TIMESTAMP(3) NOT NULL,
    "date_to" TIMESTAMP(3) NOT NULL,
    "status" "ResumeSearchStatus" NOT NULL DEFAULT 'QUEUED',
    "total" INTEGER NOT NULL DEFAULT 0,
    "processed" INTEGER NOT NULL DEFAULT 0,
    "succeeded" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),

    CONSTRAINT "resume_searches_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "resume_applicants" (
    "id" TEXT NOT NULL,
    "search_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "gmail_message_id" TEXT NOT NULL,
    "gmail_attachment_id" TEXT NOT NULL,
    "candidate_name" TEXT,
    "candidate_email" TEXT,
    "email_subject" TEXT NOT NULL,
    "received_at" TIMESTAMP(3) NOT NULL,
    "original_filename" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "file_size" INTEGER,
    "cloudinary_public_id" TEXT,
    "cloudinary_url" TEXT,
    "status" "ResumeApplicantStatus" NOT NULL DEFAULT 'DISCOVERED',
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resume_applicants_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "resume_applicants_search_id_gmail_message_id_gmail_attachment_id_key"
ON "resume_applicants"("search_id", "gmail_message_id", "gmail_attachment_id");

CREATE INDEX "resume_searches_user_id_created_at_idx"
ON "resume_searches"("user_id", "created_at");

CREATE INDEX "resume_searches_user_id_status_idx"
ON "resume_searches"("user_id", "status");

CREATE INDEX "resume_applicants_user_id_created_at_idx"
ON "resume_applicants"("user_id", "created_at");

CREATE INDEX "resume_applicants_search_id_status_idx"
ON "resume_applicants"("search_id", "status");

ALTER TABLE "resume_searches"
ADD CONSTRAINT "resume_searches_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "resume_applicants"
ADD CONSTRAINT "resume_applicants_search_id_fkey"
FOREIGN KEY ("search_id") REFERENCES "resume_searches"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
