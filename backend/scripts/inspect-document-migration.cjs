// Read-only metadata/count checks. Never prints document content or credentials.
require('dotenv').config({ path: require('node:path').resolve(__dirname, '../../.env') });
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
async function main() {
  console.log(JSON.stringify(await db.$queryRawUnsafe(`
    SELECT c.relname AS table_name, a.attname AS column_name,
           format_type(a.atttypid, a.atttypmod) AS type
    FROM pg_attribute a JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname IN ('memories','users')
      AND a.attname IN ('embedding','calendarAccessToken','calendarRefreshToken','calendarTokenExpiry')
      AND NOT a.attisdropped ORDER BY c.relname, a.attname
  `)));
  console.log(JSON.stringify(await db.$queryRawUnsafe(`
    SELECT tablename, indexname, indexdef FROM pg_indexes
    WHERE schemaname = 'public' AND tablename IN ('users','memories','tasks','documents')
    ORDER BY tablename, indexname
  `)));
  console.log(JSON.stringify(await db.$queryRawUnsafe(`
    SELECT count(*)::int AS documents FROM documents
  `)));
}
main().catch(e => { console.error(e.message); process.exitCode = 1; }).finally(() => db.$disconnect());
