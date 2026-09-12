{
"schema_version": 1,
"ingestion_job_id": "job_123"
}
The worker finishes processing, but crashes before the queue receives its acknowledgment. The message is delivered again. What should the next worker check before doing any processing?

PostgreSQL transaction:
Create document version
Create ingestion job
Create pending outbox event
COMMIT
