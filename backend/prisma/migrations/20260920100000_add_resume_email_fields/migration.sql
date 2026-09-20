ALTER TABLE "resume_applicants"
ADD COLUMN "gmail_thread_id" TEXT NOT NULL DEFAULT '',
ADD COLUMN "email_from" TEXT NOT NULL DEFAULT '',
ADD COLUMN "email_to" TEXT NOT NULL DEFAULT '',
ADD COLUMN "email_body" TEXT NOT NULL DEFAULT '',
ADD COLUMN "email_snippet" TEXT NOT NULL DEFAULT '',
ADD COLUMN "gmail_label_ids" JSONB;
