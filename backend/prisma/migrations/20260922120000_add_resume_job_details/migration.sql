CREATE TABLE "resume_job_details" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "title" TEXT,
    "required_skills" JSONB,
    "preferred_skills" JSONB,
    "minimum_experience" INTEGER,
    "maximum_experience" INTEGER,
    "education" TEXT,
    "responsibilities" JSONB,
    "location" TEXT,
    "employment_type" TEXT,
    "seniority" TEXT,
    "certifications" JSONB,
    "languages" JSONB,
    "notes" TEXT,
    "raw_extracted_data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resume_job_details_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "resume_job_details_job_id_key" ON "resume_job_details"("job_id");
CREATE INDEX "resume_job_details_job_id_idx" ON "resume_job_details"("job_id");

ALTER TABLE "resume_job_details"
ADD CONSTRAINT "resume_job_details_job_id_fkey"
FOREIGN KEY ("job_id") REFERENCES "resume_searches"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
