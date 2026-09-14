import os

from langchain_openai import OpenAIEmbeddings


def embed_texts(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []
    if not os.environ.get("OPENAI_API_KEY"):
        raise RuntimeError("OPENAI_API_KEY is missing")

    embedder = OpenAIEmbeddings(
        model=os.environ.get(
            "OPENAI_EMBEDDING_MODEL",
            "text-embedding-3-small",
        ),
        dimensions=1536,
    )

    vectors = embedder.embed_documents(texts)
    if len(vectors) != len(texts) or any(len(vector) != 1536 for vector in vectors):
        raise RuntimeError("Embedding response has an unexpected shape")
    return vectors
