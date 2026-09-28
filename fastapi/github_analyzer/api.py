from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel, Field

from .graph import build_github_analyzer_graph


class AnalyzerChunk(BaseModel):
    chunkId: str
    reviewId: str
    repositoryId: int
    commitSha: str
    filePath: str
    fileCategory: str
    language: str
    chunkIndex: int
    totalChunks: int
    startLine: int
    endLine: int
    summary: str
    content: str


class GitHubAnalyzeRequest(BaseModel):
    reviewId: str
    repositoryId: int
    repositoryUrl: str
    owner: str
    repository: str
    commitSha: str
    chunks: list[AnalyzerChunk] = Field(default_factory=list)


github_analyzer_router = APIRouter(prefix="/github", tags=["github-analyzer"])


@github_analyzer_router.post("/analyze")
def analyze_github_repository(payload: GitHubAnalyzeRequest) -> dict[str, Any]:
    graph = build_github_analyzer_graph()
    result = graph.invoke(payload.model_dump())

    return {
        "data": {
            "reviewId": payload.reviewId,
            "status": "ready",
            "routedChunkCounts": {
                category: len(chunks)
                for category, chunks in result.get("routedChunks", {}).items()
            },
            "findings": result.get("finalFindings", []),
        }
    }
