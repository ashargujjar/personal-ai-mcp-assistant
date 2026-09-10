CREATE TABLE "documents" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "filename" TEXT NOT NULL,
  "original_filename" TEXT NOT NULL,
  "storage_key" TEXT NOT NULL,
  "mime_type" TEXT NOT NULL,
  "file_size" INTEGER NOT NULL CHECK ("file_size" > 0 AND "file_size" <= 20971520),
  "file_hash" TEXT NOT NULL,
  "title" TEXT,
  "author" TEXT,
  "language" TEXT,
  "status" TEXT NOT NULL DEFAULT 'uploaded',
  "embedding_model" TEXT,
  "parser_version" TEXT,
  "chunking_version" TEXT,
  "page_count" INTEGER CHECK ("page_count" > 0),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "documents_storage_key_key" ON "documents"("storage_key");
CREATE INDEX "documents_tenant_id_user_id_created_at_idx" ON "documents"("tenant_id", "user_id", "created_at");
CREATE INDEX "documents_tenant_id_file_hash_idx" ON "documents"("tenant_id", "file_hash");
