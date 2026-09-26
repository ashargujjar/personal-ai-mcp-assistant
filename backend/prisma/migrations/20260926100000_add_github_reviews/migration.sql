-- CreateEnum
CREATE TYPE "GitHubReviewStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "github_reviews" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "repository_id" INTEGER NOT NULL,
    "repository_url" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "repository" TEXT NOT NULL,
    "status" "GitHubReviewStatus" NOT NULL DEFAULT 'QUEUED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "github_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "github_reviews_user_id_created_at_idx" ON "github_reviews"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "github_reviews_status_created_at_idx" ON "github_reviews"("status", "created_at");

-- AddForeignKey
ALTER TABLE "github_reviews" ADD CONSTRAINT "github_reviews_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
