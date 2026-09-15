-- Accelerate per-user metadata routing and keyword containment checks.
CREATE INDEX "documents_user_id_updated_at_idx"
    ON "documents" ("user_id", "updated_at" DESC);

CREATE INDEX "documents_keywords_gin_idx"
    ON "documents" USING GIN ("keywords");
