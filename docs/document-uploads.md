# PDF uploads

Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in root .env for Docker, or backend/.env for local development. Existing CLOUDINARY_NAME, CLOUDINARY_API and CLOUDINARY_SECRET names are also supported. Keep credentials on the backend. Requires Node 20+.

From backend/, run `npm run prisma:generate` and `npx prisma migrate deploy`, then restart. The frontend uses VITE_API_URL and the login token.

POST /api/documents?filename=example.pdf accepts PDF bytes with Content-Type: application/pdf and Authorization: Bearer <token>. Optional title, author and language query parameters are supported. Uploads are limited to 20 MB and 10 requests/minute/IP. The backend checks the PDF header, computes SHA-256 and stores an authenticated raw Cloudinary asset. Database failures trigger storage cleanup; failed cleanup logs the storage key for reconciliation.

GET /api/documents lists owned documents. GET /api/documents/:id/download returns a signed download URL expiring after 60 seconds. DELETE /api/documents/:id deletes storage first, then the database record. All endpoints scope by user and tenant. Personal tenants currently use tenant_id = authenticated user id; organization tenants require a membership model.

All requested fields are included. File size is in bytes; filename is generated and original_filename preserves the supplied name. Status starts at uploaded. Parser, embedding and chunking versions, page count and extracted metadata remain null until processors are connected. Upload does not imply search readiness. PDF header validation is not full parsing.

Cloudinary accounts may restrict PDF delivery until enabled in security settings. Verify upload, refresh, download and delete with a small PDF; verify another account cannot access it, renamed non-PDFs are rejected and oversized files fail.

Reference: https://cloudinary.com/documentation/image_upload_api_reference

## Existing local database

The configured local database had existing tables but no Prisma migration history (P3005). The documents SQL was applied directly in a transaction and the table verified. Existing tables and migration history were left unchanged. Before using migrate deploy on this database, reconcile and baseline the existing schema, including this documents migration; do not reset the database or blindly replay migrations. Fresh databases can use the migration workflow above.
