from typing import Literal

from langchain_core.messages import HumanMessage, SystemMessage
from pydantic import BaseModel, Field

from .state import AnalyzerFinding, AnalyzerState, CodeChunk


class LLMFinding(BaseModel):
    severity: Literal["critical", "high", "medium", "low"]
    title: str
    summary: str
    filePath: str
    lineStart: int | None = None
    lineEnd: int | None = None
    recommendation: str
    evidenceChunkIds: list[str] = Field(default_factory=list)


class LLMFindingResponse(BaseModel):
    findings: list[LLMFinding] = Field(default_factory=list)


def route_chunks(state: AnalyzerState) -> dict:
    routed = {
        "security": [],
        "bugs": [],
        "quality": [],
        "testing": [],
        "dependencies": [],
    }

    for chunk in state["chunks"]:
        path = chunk["filePath"].lower()
        category = chunk["fileCategory"]
        summary = chunk.get("summary", "").lower()
        searchable = f"{path} {summary}"

        if category in ("source", "configuration", "dependency-manifest") and any(
            marker in searchable
            for marker in (
                "auth",
                "login",
                "token",
                "session",
                "password",
                "permission",
                "middleware",
                "route",
                "controller",
                "api",
                "env",
                "secret",
                "security",
            )
        ):
            routed["security"].append(chunk)

        if category in ("source", "test"):
            routed["bugs"].append(chunk)

        if category in ("source", "configuration"):
            routed["quality"].append(chunk)

        if category == "test" or "test" in path or "spec" in path:
            routed["testing"].append(chunk)

        if category == "dependency-manifest" or path.endswith(("package.json", "requirements.txt", "pyproject.toml", "go.mod")):
            routed["dependencies"].append(chunk)

    return {"routedChunks": routed}


def _format_chunks(chunks: list[CodeChunk]) -> str:
    return "\n\n".join(
        (
            f"CHUNK_ID: {chunk['chunkId']}\n"
            f"FILE: {chunk['filePath']}\n"
            f"LANGUAGE: {chunk['language']}\n"
            f"LINES: {chunk['startLine']}-{chunk['endLine']}\n"
            f"SUMMARY: {chunk['summary']}\n"
            f"CODE:\n{chunk['content']}"
        )
        for chunk in chunks
    )


def make_category_agent(llm, key: str, category: str, instructions: str):
    structured_llm = llm.with_structured_output(LLMFindingResponse)

    def category_agent(state: AnalyzerState) -> dict:
        routed_chunks = state.get("routedChunks", {})
        chunks = routed_chunks.get(key, [])
        if not chunks:
            return {"findings": {key: []}}

        system_prompt = f"""
You are the {category} analyzer for a GitHub repository security review.

Analyze only the provided code chunks for {category.lower()} concerns.
{instructions}

Return only genuine findings. Do not invent issues from missing context.
If there are no reliable findings, return an empty findings list.
Every finding must reference an existing file path and use evidence chunk IDs
from the provided chunks.
"""
        user_prompt = (
            f"Repository: {state['owner']}/{state['repository']}\n"
            f"Commit: {state['commitSha']}\n\n"
            f"CHUNKS:\n{_format_chunks(chunks)}"
        )

        response = structured_llm.invoke(
            [
                SystemMessage(content=system_prompt),
                HumanMessage(content=user_prompt),
            ]
        )

        findings: list[AnalyzerFinding] = []
        for finding in response.findings:
            findings.append(
                {
                    "category": category,
                    "severity": finding.severity,
                    "title": finding.title,
                    "summary": finding.summary,
                    "filePath": finding.filePath,
                    "lineStart": finding.lineStart,
                    "lineEnd": finding.lineEnd,
                    "recommendation": finding.recommendation,
                    "evidenceChunkIds": finding.evidenceChunkIds,
                }
            )

        return {"findings": {key: findings}}

    return category_agent


def security_agent(llm):
    return make_category_agent(
        llm,
        "security",
        "Security",
        "Look for authentication, authorization, injection, secrets, unsafe input handling, "
        "SSRF, path traversal, insecure cryptography, sensitive data exposure, and security misconfiguration.",
    )


def bugs_agent(llm):
    return make_category_agent(
        llm,
        "bugs",
        "Bugs",
        "Look for concrete correctness defects, broken edge cases, unsafe error handling, "
        "invalid state transitions, race conditions, and likely runtime failures.",
    )


def quality_agent(llm):
    return make_category_agent(
        llm,
        "quality",
        "Quality",
        "Look for maintainability problems, excessive duplication, unclear boundaries, "
        "misleading abstractions, and code patterns likely to create future defects.",
    )


def testing_agent(llm):
    return make_category_agent(
        llm,
        "testing",
        "Testing",
        "Look for important behavior without tests, weak assertions, missing negative-path coverage, "
        "and security-sensitive flows that are not adequately tested.",
    )


def dependencies_agent(llm):
    return make_category_agent(
        llm,
        "dependencies",
        "Dependencies",
        "Look for risky dependency usage, suspicious package configuration, unpinned versions, "
        "deprecated patterns, and dependency-related security concerns visible in the supplied manifests.",
    )


def aggregate_findings(state: AnalyzerState) -> dict:
    final_findings: list[AnalyzerFinding] = []

    for category_findings in state.get("findings", {}).values():
        final_findings.extend(category_findings)

    return {"finalFindings": final_findings}
