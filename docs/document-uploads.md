# PDF uploads

Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in root .env for Docker, or backend/.env for local development. Existing CLOUDINARY_NAME, CLOUDINARY_API and CLOUDINARY_SECRET names are also supported. Keep credentials on the backend. Requires Node 20+.

From backend/, run `npm run prisma:generate` and `npx prisma migrate deploy`, then restart. The frontend uses VITE_API_URL and the login token.

POST /api/documents?filename=example.pdf accepts PDF bytes with Content-Type: application/pdf and Authorization: Bearer <token>. Optional title, author and language query parameters are supported. Uploads are limited to 20 MB and 10 requests/minute/IP. The backend checks the PDF header, computes SHA-256 and stores an authenticated raw Cloudinary asset. Database failures trigger storage cleanup; failed cleanup logs the storage key for reconciliation.

GET /api/documents lists owned documents. GET /api/documents/:id/download returns a signed download URL expiring after 60 seconds. DELETE /api/documents/:id deletes storage first, then the database record. All endpoints scope by user and tenant. Personal tenants currently use tenant_id = authenticated user id; organization tenants require a membership model.

File details now live only on `DocumentVersion`: generated filename, original filename, storage key, MIME type, byte size, and SHA-256. `Document` owns identity, tenant/user, and descriptive metadata. Upload creates the document and version 1 in one Prisma nested write. The API flattens the latest version's file fields into the existing response shape and adds `documentVersionId` and `versionNumber`, so the frontend remains compatible.

List/download choose the highest version number for file management. This is not the future retrieval publication rule. Replacement uploads are not exposed yet. Delete removes every version's storage asset before deleting version rows and the document in one database transaction. If storage deletion fails partway, database references remain for retry; some assets may already be gone. Cloudinary's `not found` deletion result is treated as success.

Status starts at uploaded. New uploads also atomically create a queued ingestion job and pending outbox event; see [ingestion jobs](ingestion-jobs.md). Their IDs/status are exposed as `ingestionJobId` and `ingestionStatus`. Legacy processing fields and page count remain on Document temporarily for compatibility. Upload does not imply search readiness. PDF header validation is not full parsing.

Cloudinary accounts may restrict PDF delivery until enabled in security settings. Verify upload, refresh, download and delete with a small PDF; verify another account cannot access it, renamed non-PDFs are rejected and oversized files fail.

Reference: https://cloudinary.com/documentation/image_upload_api_reference

## Existing local database

On 2026-09-12 the configured local database was inspected: the six historical migrations' tables/fields were present, but their history was unrecorded. They were marked applied with `prisma migrate resolve --applied`; no tables were reset. The reconciliation migration records previously unmanaged calendar fields and the memory user/key unique index, and works on both existing and fresh databases.

The document-version migration was then applied. It creates versions, copies and verifies all legacy file fields into version 1, and removes the old file columns in one transaction. The local database had zero documents at application time; legacy-data preservation was tested separately with a synthetic document in a rolled-back isolated schema.

For another existing database, inspect its schema/history before baselining; do not assume this local reconciliation applies there. Deploy the version migration with old API writers stopped, regenerate the client in the actual runtime environment, and restart the version-aware backend. This coordinated migration is not a zero-downtime rollout.

## Verification

From `backend/`:

```powershell
node tests/document-version-migration.cjs
$env:DOTENV_CONFIG_PATH = '../.env'
node -r dotenv/config --import tsx --test tests/document-versions.test.ts
npm run typecheck
```

The migration test replays history in a temporary schema inside a rolled-back transaction. The controller test uses the configured database with uniquely named synthetic users/documents and cleans them up; Cloudinary is mocked. Run these against a development/test database.
