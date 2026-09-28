from typing import Annotated, Literal, TypedDict
from typing_extensions import NotRequired


FileCategory = Literal[
    "source",
    "configuration",
    "documentation",
    "test",
    "dependency-manifest",
    "unknown",
]

FindingCategory = Literal[
    "Security",
    "Bugs",
    "Quality",
    "Testing",
    "Dependencies",
]

Severity = Literal["critical", "high", "medium", "low"]


class CodeChunk(TypedDict):
    chunkId: str
    reviewId: str
    repositoryId: int
    commitSha: str
    filePath: str
    fileCategory: FileCategory
    language: str
    chunkIndex: int
    totalChunks: int
    startLine: int
    endLine: int
    summary: str
    content: str


class AnalyzerFinding(TypedDict):
    category: FindingCategory
    severity: Severity
    title: str
    summary: str
    filePath: str
    lineStart: int | None
    lineEnd: int | None
    recommendation: str
    evidenceChunkIds: list[str]


def merge_findings(
    current: dict[str, list[AnalyzerFinding]] | None,
    update: dict[str, list[AnalyzerFinding]] | None,
) -> dict[str, list[AnalyzerFinding]]:
    merged = dict(current or {})
    for category, findings in (update or {}).items():
        merged[category] = findings
    return merged


class AnalyzerState(TypedDict):
    reviewId: str
    repositoryId: int
    repositoryUrl: str
    owner: str
    repository: str
    commitSha: str
    chunks: list[CodeChunk]
    routedChunks: NotRequired[dict[str, list[CodeChunk]]]
    findings: NotRequired[
        Annotated[dict[str, list[AnalyzerFinding]], merge_findings]
    ]
    finalFindings: NotRequired[list[AnalyzerFinding]]
    errors: NotRequired[list[str]]
