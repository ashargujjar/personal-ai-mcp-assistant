CREATE TABLE "resume_ats_results" (
    "id" TEXT NOT NULL,
    "search_id" TEXT NOT NULL,
    "applicant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "match_score" INTEGER NOT NULL,
    "skills" JSONB NOT NULL,
    "matched_skills" JSONB NOT NULL,
    "experience_years" INTEGER,
    "experience_summary" TEXT,
    "education" TEXT,
    "strengths" JSONB NOT NULL,
    "gaps" JSONB NOT NULL,
    "raw_model_output" JSONB,
    "scan_version" TEXT NOT NULL DEFAULT 'resume-ats-v1',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resume_ats_results_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "resume_ats_results_applicant_id_key"
ON "resume_ats_results"("applicant_id");

CREATE INDEX "resume_ats_results_search_id_match_score_idx"
ON "resume_ats_results"("search_id", "match_score");

CREATE INDEX "resume_ats_results_user_id_created_at_idx"
ON "resume_ats_results"("user_id", "created_at");

ALTER TABLE "resume_ats_results"
ADD CONSTRAINT "resume_ats_results_search_id_fkey"
FOREIGN KEY ("search_id") REFERENCES "resume_searches"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "resume_ats_results"
ADD CONSTRAINT "resume_ats_results_applicant_id_fkey"
FOREIGN KEY ("applicant_id") REFERENCES "resume_applicants"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
