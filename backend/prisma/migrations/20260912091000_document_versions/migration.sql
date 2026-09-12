BEGIN;

-- Deploy together with the version-aware API; old API writers must be stopped.
LOCK TABLE "documents" IN ACCESS EXCLUSIVE MODE;

CREATE TABLE "document_versions" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "document_id" TEXT NOT NULL REFERENCES "documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "version_number" INTEGER NOT NULL CHECK ("version_number" > 0),
  "filename" TEXT NOT NULL,
  "storage_key" TEXT NOT NULL,
  "original_filename" TEXT NOT NULL,
  "mime_type" TEXT NOT NULL,
  "file_size" INTEGER NOT NULL CHECK ("file_size" > 0 AND "file_size" <= 20971520),
  "file_hash" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "document_versions_storage_key_key" ON "document_versions"("storage_key");
CREATE UNIQUE INDEX "document_versions_document_id_version_number_key" ON "document_versions"("document_id", "version_number");
CREATE INDEX "document_versions_file_hash_idx" ON "document_versions"("file_hash");

-- Existing document IDs are unique, so this deterministic backfill ID is unique.
INSERT INTO "document_versions" (
  "id", "document_id", "version_number", "filename", "storage_key",
  "original_filename", "mime_type", "file_size", "file_hash", "created_at"
)
SELECT 'dv_' || "id", "id", 1, "filename", "storage_key",
       "original_filename", "mime_type", "file_size", "file_hash", "created_at"
FROM "documents";

-- Abort the transaction rather than remove source columns if any copy differs.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "documents" d
    LEFT JOIN "document_versions" v ON v."document_id" = d."id" AND v."version_number" = 1
    WHERE v."id" IS NULL OR
      ROW(d."filename", d."storage_key", d."original_filename", d."mime_type", d."file_size", d."file_hash", d."created_at")
      IS DISTINCT FROM
      ROW(v."filename", v."storage_key", v."original_filename", v."mime_type", v."file_size", v."file_hash", v."created_at")
  ) THEN
    RAISE EXCEPTION 'Document version backfill verification failed';
  END IF;
END $$;

ALTER TABLE "documents"
  DROP COLUMN "filename",
  DROP COLUMN "storage_key",
  DROP COLUMN "original_filename",
  DROP COLUMN "mime_type",
  DROP COLUMN "file_size",
  DROP COLUMN "file_hash";

COMMIT;
