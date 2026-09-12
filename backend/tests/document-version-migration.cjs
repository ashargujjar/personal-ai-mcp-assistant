// Replay all migrations in an isolated schema, test a legacy row, then roll back.
const { readFileSync, readdirSync } = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const migrations = path.resolve(__dirname, '../prisma/migrations');
const names = readdirSync(migrations).filter(name => /^\d/.test(name)).sort();
const schema = `test_document_versions_${Date.now()}`;
let sql = `BEGIN; CREATE SCHEMA "${schema}"; SET LOCAL search_path TO "${schema}", public;\n`;
for (const name of names) {
  if (name.endsWith('_document_versions')) {
    sql += `
      INSERT INTO users (id, name, email, "updatedAt")
      VALUES ('test_owner', 'Test', 'migration@example.invalid', now());
      INSERT INTO documents (id, tenant_id, user_id, filename, original_filename,
        storage_key, mime_type, file_size, file_hash, created_at, updated_at)
      VALUES ('test_doc', 'test_owner', 'test_owner', 'generated.pdf', 'handbook.pdf',
        'test/storage', 'application/pdf', 123, 'test_hash', '2026-01-01', now());
    `;
  }
  sql += readFileSync(path.join(migrations, name, 'migration.sql'), 'utf8')
    .replace(/^BEGIN;\s*$/gm, '').replace(/^COMMIT;\s*$/gm, '') + '\n';
}
sql += `
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM document_versions WHERE document_id = 'test_doc'
    AND version_number = 1 AND filename = 'generated.pdf'
    AND original_filename = 'handbook.pdf' AND storage_key = 'test/storage'
    AND file_hash = 'test_hash' AND file_size = 123 AND created_at = '2026-01-01'
  ) THEN RAISE EXCEPTION 'Backfill did not preserve file metadata'; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'documents'
    AND column_name IN ('file_hash', 'storage_key', 'file_size', 'filename', 'original_filename', 'mime_type'))
  THEN RAISE EXCEPTION 'Duplicate file columns remain'; END IF;
  BEGIN
    INSERT INTO document_versions SELECT 'duplicate', document_id, version_number,
      filename, 'another/key', original_filename, mime_type, file_size, file_hash, created_at
      FROM document_versions WHERE document_id = 'test_doc';
    RAISE EXCEPTION 'Duplicate version number was accepted';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;
  BEGIN
    DELETE FROM documents WHERE id = 'test_doc';
    RAISE EXCEPTION 'Parent deletion was accepted with a version present';
  EXCEPTION WHEN foreign_key_violation THEN NULL;
  END;
END $$;
ROLLBACK;
`;
const result = spawnSync(process.execPath, [
  path.resolve(__dirname, '../node_modules/prisma/build/index.js'),
  'db', 'execute', '--stdin', '--schema', path.resolve(__dirname, '../prisma/schema.prisma'),
], { input: sql, encoding: 'utf8', env: process.env });
if (result.error) throw result.error;
if (result.status !== 0) {
  console.error(result.stderr || result.stdout);
  process.exit(result.status || 1);
}
console.log('PASS: fresh migration replay, legacy backfill, column removal, version uniqueness, deletion restriction; all rolled back.');
