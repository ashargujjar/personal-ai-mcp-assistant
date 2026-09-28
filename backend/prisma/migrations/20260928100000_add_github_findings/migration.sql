CREATE TABLE "github_findings" (
    "id" TEXT NOT NULL,
    "review_id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "line_start" INTEGER,
    "line_end" INTEGER,
    "recommendation" TEXT NOT NULL,
    "evidence_chunk_ids" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "github_findings_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "github_findings_review_id_category_idx"
ON "github_findings"("review_id", "category");

CREATE INDEX "github_findings_review_id_severity_idx"
ON "github_findings"("review_id", "severity");

ALTER TABLE "github_findings"
ADD CONSTRAINT "github_findings_review_id_fkey"
FOREIGN KEY ("review_id") REFERENCES "github_reviews"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
