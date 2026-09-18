import os
import re
from retrieval.query_generation import generate_queries
from ingestion.db import connect_db


TOKEN_RE = re.compile(r"[a-z0-9][a-z0-9_-]*", re.IGNORECASE)


def _vector_literal(vector: list[float]) -> str:
    return "[" + ",".join(str(float(value)) for value in vector) + "]"


def _chunk_key(row: dict) -> tuple:
    return (
        row["document_id"],
        row["page_start"],
        row["page_end"],
        row["text"],
    )


def _rrf_merge(result_lists: list[list[dict]], limit: int) -> list[dict]:
    merged = {}

    for results in result_lists:
        for rank, row in enumerate(results, start=1):
            key = _chunk_key(row)

            if key not in merged:
                merged[key] = {
                    **row,
                    "rrf_score": 0.0,
                    "matched_queries": 0,
                    "best_similarity": row.get("similarity", 0),
                }

            merged[key]["rrf_score"] += 1 / (60 + rank)
            merged[key]["matched_queries"] += 1
            merged[key]["best_similarity"] = max(
                merged[key]["best_similarity"],
                row.get("similarity", 0),
            )

    ranked = sorted(
        merged.values(),
        key=lambda row: row["rrf_score"],
        reverse=True,
    )

    return ranked[:limit]


def _search_chunks_for_vector(
    vector: str,
    user_id: str | None = None,
    selected_document_id: str | None = None,
    limit: int = 5,
) -> list[dict]:
    filters = [
        "cs.status='READY'",
        "dc.embedding IS NOT NULL",
    ]
    params = [vector]

    if user_id:
        filters.append("d.user_id=%s")
        params.append(user_id)

    if selected_document_id:
        filters.append("d.id=%s")
        params.append(selected_document_id)

    params.extend([vector, limit])

    sql = f"""
        SELECT dc.text, dc.page_start, dc.page_end, d.id AS document_id,
               d.title AS document_title, d.short_description AS document_description,
               d.keywords AS document_keywords,
               1 - (dc.embedding <=> %s::vector) AS similarity
        FROM document_chunks dc
        JOIN chunk_sets cs ON cs.id=dc.chunk_set_id
        JOIN document_versions dv ON dv.id=cs.document_version_id
        JOIN documents d ON d.id=dv.document_id
        WHERE {" AND ".join(filters)}
        ORDER BY dc.embedding <=> %s::vector
        LIMIT %s
    """

    with connect_db() as connection:
        return [
            dict(row)
            for row in connection.execute(sql, params).fetchall()
        ]


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


def search_pdf_chunks(
    question: str,
    user_id: str | None = None,
    limit: int = 5,
) -> list[dict]:
    if not question.strip():
        return []

    selected_document = choose_document(question, user_id=user_id)

    from langchain_openai import OpenAIEmbeddings

    embedder = OpenAIEmbeddings(
        model=os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small"),
        dimensions=1536,
    )

    try:
        queries = generate_queries(question, number_of_queries=4)
    except Exception:
        queries = [question.strip()]

    if not queries:
        queries = [question.strip()]

    query_vectors = embedder.embed_documents(queries)
    result_lists = []

    for query_vector in query_vectors:
        rows = _search_chunks_for_vector(
            vector=_vector_literal(query_vector),
            user_id=user_id,
            # Search all of the user's documents. Metadata selection is
            # retained as context, but is not a hard retrieval filter.
            selected_document_id=None,
            limit=limit,
        )
        result_lists.append(rows)

    rows = _rrf_merge(result_lists, limit=limit)

    for row in rows:
        row["selected_document"] = selected_document
        row["retrieval_queries"] = queries

    return rows
