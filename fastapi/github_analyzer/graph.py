from langgraph.graph import END, START, StateGraph

from .nodes import (
    aggregate_findings,
    bugs_agent,
    dependencies_agent,
    quality_agent,
    route_chunks,
    security_agent,
    testing_agent,
)
from .state import AnalyzerState


def build_github_analyzer_graph(llm):
    builder = StateGraph(AnalyzerState)

    builder.add_node("router", route_chunks)
    builder.add_node("security", security_agent(llm))
    builder.add_node("bugs", bugs_agent(llm))
    builder.add_node("quality", quality_agent(llm))
    builder.add_node("testing", testing_agent(llm))
    builder.add_node("dependencies", dependencies_agent(llm))
    builder.add_node("aggregator", aggregate_findings)

    builder.add_edge(START, "router")
    builder.add_edge("router", "security")
    builder.add_edge("router", "bugs")
    builder.add_edge("router", "quality")
    builder.add_edge("router", "testing")
    builder.add_edge("router", "dependencies")
    builder.add_edge("security", "aggregator")
    builder.add_edge("bugs", "aggregator")
    builder.add_edge("quality", "aggregator")
    builder.add_edge("testing", "aggregator")
    builder.add_edge("dependencies", "aggregator")
    builder.add_edge("aggregator", END)

    return builder.compile()
