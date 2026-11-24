from langgraph.graph import StateGraph, END
from .state import AgentState
from .nodes import (
    resolve_source_node,
    static_analyze_node,
    process_findings_node,
    build_report_node
)

def create_audit_graph():
    """Builds and compiles the LangGraph audit agent workflow."""
    workflow = StateGraph(AgentState)

    workflow.add_node("resolve_source", resolve_source_node)
    workflow.add_node("static_analyze", static_analyze_node)
    workflow.add_node("process_findings", process_findings_node)
    workflow.add_node("build_report", build_report_node)

    workflow.set_entry_point("resolve_source")
    workflow.add_edge("resolve_source", "static_analyze")
    workflow.add_edge("static_analyze", "process_findings")
    workflow.add_edge("process_findings", "build_report")
    workflow.add_edge("build_report", END)

    return workflow.compile()
