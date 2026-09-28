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
        if response is None:
            response = LLMFindingResponse()

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


def _finding_words(value: str) -> set[str]:
    return {
        word
        for word in value.lower().replace("-", " ").replace("_", " ").split()
        if len(word) > 2
    }


def _same_finding(left: AnalyzerFinding, right: AnalyzerFinding) -> bool:
    if left["category"] != right["category"]:
        return False
    if left["filePath"] != right["filePath"]:
        return False

    left_title = _finding_words(left["title"])
    right_title = _finding_words(right["title"])
    title_overlap = len(left_title & right_title) / max(len(left_title | right_title), 1)

    left_start = left.get("lineStart")
    left_end = left.get("lineEnd")
    right_start = right.get("lineStart")
    right_end = right.get("lineEnd")
    line_overlap = (
        left_start is None
        or left_end is None
        or right_start is None
        or right_end is None
        or max(left_start, right_start) <= min(left_end, right_end)
    )

    return (
        left["title"].strip().lower() == right["title"].strip().lower()
        or (line_overlap and title_overlap >= 0.35)
    )


def _merge_findings(
    existing: AnalyzerFinding,
    duplicate: AnalyzerFinding,
) -> AnalyzerFinding:
    severity_order = {"low": 0, "medium": 1, "high": 2, "critical": 3}
    severity = max(
        (existing["severity"], duplicate["severity"]),
        key=lambda value: severity_order.get(value, -1),
    )

    evidence_ids = sorted(
        set(existing.get("evidenceChunkIds", []))
        | set(duplicate.get("evidenceChunkIds", []))
    )

    summary = existing["summary"].strip()
    duplicate_summary = duplicate["summary"].strip()
    if duplicate_summary and duplicate_summary.lower() not in summary.lower():
        summary = f"{summary} {duplicate_summary}"

    recommendation = existing["recommendation"].strip()
    duplicate_recommendation = duplicate["recommendation"].strip()
    if (
        duplicate_recommendation
        and duplicate_recommendation.lower() not in recommendation.lower()
    ):
        recommendation = f"{recommendation} {duplicate_recommendation}"

    return {
        **existing,
        "severity": severity,
        "summary": summary,
        "recommendation": recommendation,
        "evidenceChunkIds": evidence_ids,
        "lineStart": min(
            value
            for value in (existing.get("lineStart"), duplicate.get("lineStart"))
            if value is not None
        )
        if existing.get("lineStart") is not None or duplicate.get("lineStart") is not None
        else None,
        "lineEnd": max(
            value
            for value in (existing.get("lineEnd"), duplicate.get("lineEnd"))
            if value is not None
        )
        if existing.get("lineEnd") is not None or duplicate.get("lineEnd") is not None
        else None,
    }


def aggregate_findings(state: AnalyzerState) -> dict:
    final_findings: list[AnalyzerFinding] = []

    for category_findings in state.get("findings", {}).values():
        for finding in category_findings:
            normalized = {
                **finding,
                "title": finding["title"].strip(),
                "summary": finding["summary"].strip(),
                "recommendation": finding["recommendation"].strip(),
                "evidenceChunkIds": sorted(set(finding.get("evidenceChunkIds", []))),
            }
            duplicate_index = next(
                (
                    index
                    for index, existing in enumerate(final_findings)
                    if _same_finding(existing, normalized)
                ),
                None,
            )
            if duplicate_index is None:
                final_findings.append(normalized)
            else:
                final_findings[duplicate_index] = _merge_findings(
                    final_findings[duplicate_index],
                    normalized,
                )

    severity_order = {
        "critical": 0,
        "high": 1,
        "medium": 2,
        "low": 3,
    }
    final_findings.sort(
        key=lambda finding: (
            severity_order.get(finding["severity"], 99),
            finding["category"],
            finding["filePath"],
            finding.get("lineStart") or 0,
        )
    )

    return {"finalFindings": final_findings}
