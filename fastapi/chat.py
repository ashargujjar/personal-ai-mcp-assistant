import os
from langchain_core.messages import SystemMessage, RemoveMessage
from langgraph.graph import StateGraph, START, END
from langchain_deepseek import ChatDeepSeek
from typing import Literal
from langchain.tools import tool
from langgraph.prebuilt import ToolNode, tools_condition
from tools.tools import draft_email, get_current_timezone
from langgraph.checkpoint.memory import MemorySaver
from agents.agents import (
    State,
    after_route_guard,
    github,
    make_calender_node,
    make_gmail_node,
    make_supervisor_node,
    make_task_node,
    make_pdf_node,
    make_tools_node,
    route_guard,
)
from retrieval.vector_search import search_pdf_chunks
from typing import TypedDict

# tools all bind to supervisor for memory
llm=ChatDeepSeek(
   model= "deepseek-chat",
  api_key=os.environ["DEEPSEEK_KEY"],
  temperature=0.2
)

checkpointer = MemorySaver()

MAX_MESSAGES_BEFORE_SUMMARY = 20
KEEP_LAST_N_RAW = 6
def should_summarize(state: State) -> bool:
    return len(state.messages) > MAX_MESSAGES_BEFORE_SUMMARY


@tool
def route(agent: Literal["gmail", "github","calender","task","pdf"]) -> str:
    """Hand off the conversation to the given specialist agent."""
    return agent

def after_tools(state: State):
    last_msg = state.messages[-1]        
    if last_msg.name == "route":
        return "route_guard"             # decides whether the chosen agent is actually allowed to run
    return "supervisor"



def build_graph(mcp_tools: list):
    """Build a graph bound to this request's MCP tools (add_memory/get_memory/delete_memory).

    These come from `mcp_client.get_mcp_tools(jwt)`, which is a per-request connection —
    the tools carry a reference to that connection, so this needs to be called fresh for
    every request, not once at import time.
    """
    CONFIRM_TOOLS = {"send_email", "delete_email"}
    GMAIL_WRITE_TOOLS = {"send_email", "delete_email"}
    CALENDAR_WRITE_TOOLS = {"create_event", "delete_event"}
    TASK_WRITE_TOOLS = {"create_task", "update_task", "delete_task"}
    GMAIL_TOOL_NAMES = {"list_emails", "get_email", "send_email", "delete_email"}
    CALENDAR_TOOL_NAMES={"check_calendar_connection_status","list_events","get_event","create_event","delete_event"}
    TASK_TOOLS_NAMES={"list_tasks","get_task","create_task","update_task","delete_task"}
    gmail_tools = [t for t in mcp_tools if t.name in GMAIL_TOOL_NAMES]+[draft_email]
    gmail_tools_by_name = {t.name: t for t in gmail_tools}
    supervisor_tools = [t for t in mcp_tools if t.name not in GMAIL_TOOL_NAMES and t.name not in CALENDAR_TOOL_NAMES and t.name not in TASK_TOOLS_NAMES] + [route]
    calender_tools=[t for t in mcp_tools if t.name  in CALENDAR_TOOL_NAMES ] + [get_current_timezone]
    calender_tools_by_name = {t.name: t for t in calender_tools}
    task_tools=[t for t in mcp_tools if t.name in TASK_TOOLS_NAMES]
    task_tools_by_name = {t.name: t for t in task_tools}

    llm_with_tools = llm.bind_tools(supervisor_tools)       # supervisor never sees gmail tools
    gmail_llm = llm.bind_tools(gmail_tools)
    calender_llm = llm.bind_tools(calender_tools)
    task_llm=llm.bind_tools(task_tools)

    supervisor = make_supervisor_node(llm_with_tools)
    gmail = make_gmail_node(gmail_llm)
    calender = make_calender_node(calender_llm)
    task=make_task_node(task_llm)
    pdf = make_pdf_node(llm, search_pdf_chunks)
    gmail_tools_node = make_tools_node(gmail_tools_by_name, confirm_tools=CONFIRM_TOOLS, write_tools=GMAIL_WRITE_TOOLS)
    calender_tools_node = make_tools_node(calender_tools_by_name, write_tools=CALENDAR_WRITE_TOOLS)
    task_tools_node = make_tools_node(task_tools_by_name, write_tools=TASK_WRITE_TOOLS)

    
    def summarize(state: State):
        messages_to_drop = state.messages[:-KEEP_LAST_N_RAW]
        if not messages_to_drop:
            return {}

        if state.summary:
            prompt = (
                f"This is the summary of the conversation so far: {state.summary}\n\n"
                "Extend it with the new messages below. Keep it concise but preserve "
                "key facts, decisions, and unresolved requests."
            )
        else:
            prompt = (
                "Summarize the conversation below concisely, preserving key facts, "
                "decisions, and unresolved requests."
            )

        response = llm.invoke([SystemMessage(content=prompt), *messages_to_drop])

        return {
            "summary": response.content,
            "messages": [RemoveMessage(id=m.id) for m in messages_to_drop],
        }


    def after_supervisor(state:State)->str:
        condition_result =tools_condition(state)
        if condition_result == "tools":
            return "tools"
        return "summarize" if should_summarize(state) else END





    builder = StateGraph(State)
    builder.add_node("supervisor", supervisor)
    builder.add_node("gmail", gmail)
    builder.add_node("calender",calender)
    builder.add_node("task",task)
    builder.add_node("summarize",summarize)
    builder.add_node("github", github)
    builder.add_node("task_tools",task_tools_node)
    builder.add_node("pdf", pdf)
    builder.add_node("supervisor_tools", ToolNode(supervisor_tools))
    builder.add_node("calender_tools",calender_tools_node)
    builder.add_node("gmail_tools", gmail_tools_node)
    builder.add_node("route_guard", route_guard)
    builder.add_edge(START, "supervisor")
    builder.add_conditional_edges("supervisor", after_supervisor, {"tools": "supervisor_tools", "summarize": "summarize", END: END})
    builder.add_conditional_edges(
        "supervisor_tools", after_tools, {"route_guard": "route_guard", "supervisor": "supervisor"}
    )
    builder.add_conditional_edges(
        "route_guard", after_route_guard, {"gmail": "gmail", "github": "github", "calender": "calender", "task": "task","pdf":"pdf", "supervisor": "supervisor"}
    )
    builder.add_conditional_edges("gmail", tools_condition, {"tools": "gmail_tools", END: "supervisor"})
    builder.add_edge("gmail_tools", "gmail")
    builder.add_conditional_edges("task",tools_condition,{"tools":"task_tools",END:"supervisor"})
    builder.add_conditional_edges("calender",tools_condition,{"tools":"calender_tools",END:"supervisor"})
    builder.add_edge("calender_tools","calender")
    builder.add_edge("task_tools", "task")
    builder.add_edge("github", "supervisor")
    # PDF answers already include the retrieved document context. Sending them back through
    # the supervisor can create a duplicate relay or a second, contradictory route decision.
    builder.add_edge("pdf", END)
    builder.add_edge("summarize", END)

    return builder.compile(checkpointer=checkpointer)
