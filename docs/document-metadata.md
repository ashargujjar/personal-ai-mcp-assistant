Document metadata is extracted after parsing and committed before chunking.
Apply the Prisma migration before starting workers with this stage:

```sh
cd backend
npx prisma migrate deploy
npx prisma generate
```

Restart the backend and ingestion worker after migration/client generation.
New ingestion attempts populate documents.title, short_description, keywords
(JSON array), and page_count. Existing records remain nullable until re-ingested.
The document API already returns these document fields. Search and supervisor
routing are unchanged.

Title selection uses a usable embedded PDF title, then a first-page heading,
then the original filename. Description uses the PDF subject or the first
body paragraph with at least 12 words, limited to two sentences / 600 characters.
These are heuristic excerpts, not guaranteed whole-document summaries.

When a content-derived title or description is missing, the worker requests
structured metadata from the first 8,000 extracted characters. Set
DOCUMENT_METADATA_MODEL to override the default gpt-4o-mini model; this uses
the existing OPENAI_API_KEY. No key, timeouts, and invalid model responses
retain deterministic fallbacks (a description can remain empty). The model
has a 20-second request timeout and no automatic retries. Extracted PDF
keywords are preserved; model keywords fill gaps when the fallback is used.

Writes require a live job claim in the METADATA stage. Only the latest uploaded
version updates document metadata. Older version jobs continue without
overwriting it. Metadata persists even if subsequent embeddings fail.

Run focused tests from fastapi:

```sh
python -m unittest discover -s tests -p 'test_metadata.py'
```
