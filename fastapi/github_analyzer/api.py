from typing import Any

from fastapi import APIRouter
import os
from langchain_deepseek import ChatDeepSeek
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

llm = ChatDeepSeek(
    model=os.getenv("GITHUB_ANALYZER_MODEL", "deepseek-chat"),
    api_key=os.environ["DEEPSEEK_KEY"],
    temperature=0,
)


@github_analyzer_router.post("/analyze")
def analyze_github_repository(payload: GitHubAnalyzeRequest) -> dict[str, Any]:
    graph = build_github_analyzer_graph(llm)
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
