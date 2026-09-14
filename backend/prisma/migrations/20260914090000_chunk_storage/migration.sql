BEGIN;

CREATE TYPE "ChunkSetStatus" AS ENUM ('BUILDING', 'READY');

CREATE TABLE "chunk_sets" (
    "id" TEXT NOT NULL,
    "document_version_id" TEXT NOT NULL,
    "parser_version" TEXT NOT NULL,
    "chunking_version" TEXT NOT NULL,
    "status" "ChunkSetStatus" NOT NULL DEFAULT 'BUILDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "chunk_sets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "document_chunks" (
    "id" TEXT NOT NULL,
    "chunk_set_id" TEXT NOT NULL,
    "chunk_index" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "token_count" INTEGER NOT NULL,
    "page_start" INTEGER NOT NULL,
    "page_end" INTEGER NOT NULL,
    "source_units" JSONB NOT NULL,
    CONSTRAINT "document_chunks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "chunk_sets_document_version_id_parser_version_chunking_versi_key"
    ON "chunk_sets"("document_version_id", "parser_version", "chunking_version");
CREATE UNIQUE INDEX "document_chunks_chunk_set_id_chunk_index_key"
    ON "document_chunks"("chunk_set_id", "chunk_index");

ALTER TABLE "chunk_sets" ADD CONSTRAINT "chunk_sets_document_version_id_fkey"
    FOREIGN KEY ("document_version_id") REFERENCES "document_versions"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document_chunks" ADD CONSTRAINT "document_chunks_chunk_set_id_fkey"
    FOREIGN KEY ("chunk_set_id") REFERENCES "chunk_sets"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;
