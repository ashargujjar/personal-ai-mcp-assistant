ALTER TABLE "documents"
    ADD COLUMN "short_description" TEXT,
    ADD COLUMN "keywords" JSONB;

ALTER TYPE "IngestionStage" ADD VALUE 'METADATA';
