import os

from langchain_openai import OpenAIEmbeddings

from ingestion.db import connect_db


def search_pdf_chunks(question: str, user_id: str | None = None, limit: int = 5) -> list[dict]:
    if not question.strip():
        return []
    embedder = OpenAIEmbeddings(
        model=os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small"),
        dimensions=1536,
    )
    vector = "[" + ",".join(str(float(v)) for v in embedder.embed_query(question)) + "]"
    if user_id:
        sql = """SELECT dc.text, dc.page_start, dc.page_end, d.id AS document_id,
                         d.title AS document_title,
                         1 - (dc.embedding <=> %s::vector) AS similarity
                  FROM document_chunks dc JOIN chunk_sets cs ON cs.id=dc.chunk_set_id
                  JOIN document_versions dv ON dv.id=cs.document_version_id
                  JOIN documents d ON d.id=dv.document_id
                  WHERE cs.status='READY' AND dc.embedding IS NOT NULL AND d.user_id=%s
                  ORDER BY dc.embedding <=> %s::vector LIMIT %s"""
        params = (vector, user_id, vector, limit)
    else:
        sql = """SELECT dc.text, dc.page_start, dc.page_end, d.id AS document_id,
                         d.title AS document_title,
                         1 - (dc.embedding <=> %s::vector) AS similarity
                  FROM document_chunks dc JOIN chunk_sets cs ON cs.id=dc.chunk_set_id
                  JOIN document_versions dv ON dv.id=cs.document_version_id
                  JOIN documents d ON d.id=dv.document_id
                  WHERE cs.status='READY' AND dc.embedding IS NOT NULL
                  ORDER BY dc.embedding <=> %s::vector LIMIT %s"""
        params = (vector, vector, limit)
    with connect_db() as connection:
        return [dict(row) for row in connection.execute(sql, params).fetchall()]
