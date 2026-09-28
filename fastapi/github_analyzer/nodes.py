from .state import AnalyzerFinding, AnalyzerState, CodeChunk


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


def _placeholder_agent(state: AnalyzerState, key: str) -> dict:
    findings = dict(state.get("findings", {}))
    findings[key] = []
    return {"findings": findings}


def security_agent(state: AnalyzerState) -> dict:
    return _placeholder_agent(state, "security")


def bugs_agent(state: AnalyzerState) -> dict:
    return _placeholder_agent(state, "bugs")


def quality_agent(state: AnalyzerState) -> dict:
    return _placeholder_agent(state, "quality")


def testing_agent(state: AnalyzerState) -> dict:
    return _placeholder_agent(state, "testing")


def dependencies_agent(state: AnalyzerState) -> dict:
    return _placeholder_agent(state, "dependencies")


def aggregate_findings(state: AnalyzerState) -> dict:
    final_findings: list[AnalyzerFinding] = []

    for category_findings in state.get("findings", {}).values():
        final_findings.extend(category_findings)

    return {"finalFindings": final_findings}
