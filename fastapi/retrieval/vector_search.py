import os
import re

from ingestion.db import connect_db


TOKEN_RE = re.compile(r"[a-z0-9][a-z0-9_-]*", re.IGNORECASE)


def _query_terms(question: str) -> list[str]:
    terms = [term.lower() for term in TOKEN_RE.findall(question) if len(term) >= 3]
    stop_words = {
        "about", "from", "give", "have", "please", "show", "summarize", "summary",
        "tell", "what", "which", "with", "document", "documents", "file", "files",
        "pdf", "pdfs", "uploaded",
    }
    return list(dict.fromkeys(term for term in terms if term not in stop_words))[:8]


def find_matching_documents(question: str, user_id: str | None = None, limit: int = 3) -> list[dict]:
    terms = _query_terms(question)
    if not terms:
        return []

    conditions = []
    params = []
    for term in terms:
        pattern = f"%{term}%"
        conditions.append("""
            CASE WHEN lower(coalesce(d.title, '')) LIKE %s THEN 4 ELSE 0 END +
            CASE WHEN lower(coalesce(d.short_description, '')) LIKE %s THEN 2 ELSE 0 END +
            CASE WHEN lower(coalesce(d.keywords::text, '')) LIKE %s THEN 3 ELSE 0 END +
            CASE WHEN lower(coalesce(v.original_filename, '')) LIKE %s THEN 4 ELSE 0 END
        """)
        params.extend([pattern, pattern, pattern, pattern])

    where = ["d.status IN ('uploaded', 'ready')"]
    if user_id:
        where.append("d.user_id = %s")
        params.append(user_id)
    params.append(limit)

    sql = f"""
        SELECT d.id, d.title, d.short_description, d.keywords,
               v.original_filename,
               ({" + ".join(conditions)}) AS score
        FROM documents d
        JOIN LATERAL (
            SELECT original_filename
            FROM document_versions
            WHERE document_id = d.id
            ORDER BY version_number DESC
            LIMIT 1
        ) v ON TRUE
        WHERE {" AND ".join(where)}
        ORDER BY score DESC, d.updated_at DESC
        LIMIT %s
    """

    with connect_db() as connection:
        rows = [dict(row) for row in connection.execute(sql, params).fetchall()]
    return [row for row in rows if row["score"] > 0]


def choose_document(question: str, user_id: str | None = None) -> dict | None:
    candidates = find_matching_documents(question, user_id=user_id, limit=3)
    if not candidates:
        return None
    best = candidates[0]
    next_score = candidates[1]["score"] if len(candidates) > 1 else 0
    if best["score"] >= 4 and best["score"] >= next_score + 2:
        return best
    if best["score"] >= 8 and best["score"] > next_score:
        return best
    return None


def search_pdf_chunks(question: str, user_id: str | None = None, limit: int = 5) -> list[dict]:
    if not question.strip():
        return []
    selected_document = choose_document(question, user_id=user_id)
    from langchain_openai import OpenAIEmbeddings

    embedder = OpenAIEmbeddings(
        model=os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small"),
        dimensions=1536,
    )
    vector = "[" + ",".join(str(float(v)) for v in embedder.embed_query(question)) + "]"
    document_filter = ""
    params = []
    if user_id:
        params.append(user_id)
    if selected_document:
        document_filter = " AND d.id=%s"
        params.append(selected_document["id"])

    if user_id:
        sql = """SELECT dc.text, dc.page_start, dc.page_end, d.id AS document_id,
                         d.title AS document_title, d.short_description AS document_description,
                         d.keywords AS document_keywords,
                         1 - (dc.embedding <=> %s::vector) AS similarity
                  FROM document_chunks dc JOIN chunk_sets cs ON cs.id=dc.chunk_set_id
                  JOIN document_versions dv ON dv.id=cs.document_version_id
                  JOIN documents d ON d.id=dv.document_id
                  WHERE cs.status='READY' AND dc.embedding IS NOT NULL AND d.user_id=%s""" + document_filter + """
                  ORDER BY dc.embedding <=> %s::vector LIMIT %s"""
        params = (vector, *params, vector, limit)
    else:
        sql = """SELECT dc.text, dc.page_start, dc.page_end, d.id AS document_id,
                         d.title AS document_title, d.short_description AS document_description,
                         d.keywords AS document_keywords,
                         1 - (dc.embedding <=> %s::vector) AS similarity
                  FROM document_chunks dc JOIN chunk_sets cs ON cs.id=dc.chunk_set_id
                  JOIN document_versions dv ON dv.id=cs.document_version_id
                  JOIN documents d ON d.id=dv.document_id
                  WHERE cs.status='READY' AND dc.embedding IS NOT NULL""" + document_filter + """
                  ORDER BY dc.embedding <=> %s::vector LIMIT %s"""
        params = (vector, *params, vector, limit)
    with connect_db() as connection:
        rows = [dict(row) for row in connection.execute(sql, params).fetchall()]
    for row in rows:
        row["selected_document"] = selected_document
    return rows
