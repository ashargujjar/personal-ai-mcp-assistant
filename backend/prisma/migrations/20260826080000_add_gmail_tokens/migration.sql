-- AlterTable
ALTER TABLE "users"
ADD COLUMN "gmailAccessToken" TEXT,
ADD COLUMN "gmailRefreshToken" TEXT,
ADD COLUMN "gmailTokenExpiry" TIMESTAMP(3);
