-- These fields/index existed in the local database outside migration history.
-- IF NOT EXISTS also allows a fresh database to replay the full history.
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "calendarAccessToken" TEXT,
  ADD COLUMN IF NOT EXISTS "calendarRefreshToken" TEXT,
  ADD COLUMN IF NOT EXISTS "calendarTokenExpiry" TIMESTAMP(3);
CREATE UNIQUE INDEX IF NOT EXISTS "memories_userId_key_key" ON "memories"("userId", "key");
