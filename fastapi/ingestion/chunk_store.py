import json
from typing import Any
from uuid import uuid4

from ingestion.db import connect_db


def store_chunks(job_id: str, claim_token: str, chunks: list[Any], *, parser_version: str = "pdf-parser-v1", chunking_version: str = "heading-chunker-v1") -> bool:
    with connect_db() as connection:
        job = connection.execute(
            """SELECT document_version_id FROM ingestion_jobs
               WHERE id=%s AND status='RUNNING' AND claim_token=%s
               AND lease_expires_at > clock_timestamp()
               FOR UPDATE""", (job_id, claim_token)
        ).fetchone()
        if job is None:
            return False
        chunk_set = connection.execute(
            """INSERT INTO chunk_sets (id, document_version_id, parser_version, chunking_version, updated_at)
               VALUES (%s,%s,%s,%s,clock_timestamp())
               ON CONFLICT (document_version_id, parser_version, chunking_version)
               DO UPDATE SET status='BUILDING', updated_at=clock_timestamp()
               RETURNING id""",
            (str(uuid4()), job["document_version_id"], parser_version, chunking_version),
        ).fetchone()
        set_id = chunk_set["id"]
        connection.execute("DELETE FROM document_chunks WHERE chunk_set_id=%s", (set_id,))
        for chunk in chunks:
            connection.execute(
                """INSERT INTO document_chunks
                   (id,chunk_set_id,chunk_index,text,token_count,page_start,page_end,source_units)
                   VALUES (%s,%s,%s,%s,%s,%s,%s,%s::jsonb)""",
                (str(uuid4()), set_id, chunk.chunk_index, chunk.text, chunk.token_count,
                 chunk.page_start, chunk.page_end, json.dumps(chunk.source_units)),
            )
        connection.execute("UPDATE chunk_sets SET status='READY', updated_at=clock_timestamp() WHERE id=%s", (set_id,))
    return True


def store_embeddings(job_id: str, claim_token: str, vectors: list[list[float]]) -> bool:
    with connect_db() as connection:
        rows = connection.execute(
            """SELECT cs.id, dc.chunk_index FROM chunk_sets cs
               JOIN document_versions v ON v.id=cs.document_version_id
               JOIN ingestion_jobs j ON j.document_version_id=v.id
               JOIN document_chunks dc ON dc.chunk_set_id=cs.id
               WHERE j.id=%s AND j.status='RUNNING' AND j.claim_token=%s
               AND cs.status='READY' ORDER BY dc.chunk_index FOR UPDATE""",
            (job_id, claim_token),
        ).fetchall()
        if len(rows) != len(vectors):
            return False
        for row, vector in zip(rows, vectors):
            value = "[" + ",".join(str(float(item)) for item in vector) + "]"
            connection.execute(
                "UPDATE document_chunks SET embedding=%s::vector WHERE chunk_set_id=%s AND chunk_index=%s",
                (value, row["id"], row["chunk_index"]),
            )
    return True
