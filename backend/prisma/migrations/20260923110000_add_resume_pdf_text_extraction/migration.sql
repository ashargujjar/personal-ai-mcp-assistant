ALTER TABLE "resume_applicants"
ADD COLUMN "pdf_text_extraction" JSONB,
ADD COLUMN "pdf_text_extracted_at" TIMESTAMP(3);
