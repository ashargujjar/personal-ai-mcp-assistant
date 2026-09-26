CREATE TABLE "repository_manifests" (
    "id" TEXT NOT NULL,
    "review_id" TEXT NOT NULL,
    "repository_id" INTEGER NOT NULL,
    "repository_url" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "repository" TEXT NOT NULL,
    "commit_sha" TEXT NOT NULL,
    "file_count" INTEGER NOT NULL DEFAULT 0,
    "source_file_count" INTEGER NOT NULL DEFAULT 0,
    "config_file_count" INTEGER NOT NULL DEFAULT 0,
    "documentation_file_count" INTEGER NOT NULL DEFAULT 0,
    "test_file_count" INTEGER NOT NULL DEFAULT 0,
    "manifest_file_count" INTEGER NOT NULL DEFAULT 0,
    "unknown_file_count" INTEGER NOT NULL DEFAULT 0,
    "files" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "repository_manifests_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "repository_manifests_review_id_key"
ON "repository_manifests"("review_id");

CREATE INDEX "repository_manifests_repository_id_commit_sha_idx"
ON "repository_manifests"("repository_id", "commit_sha");

ALTER TABLE "repository_manifests"
ADD CONSTRAINT "repository_manifests_review_id_fkey"
FOREIGN KEY ("review_id") REFERENCES "github_reviews"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
