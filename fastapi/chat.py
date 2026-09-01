import os
from langchain.messages import AIMessage,HumanMessage,SystemMessage,AnyMessage,RemoveMessage
from langgraph.graph import add_messages,StateGraph,START,END
from langchain_deepseek import ChatDeepSeek
from typing import Annotated,Literal,List,Optional
from pydantic import BaseModel,Field
from langchain.tools import tool
from langgraph.prebuilt import ToolNode, tools_condition
from prompts.prompts import gmail_system_message,system_message
from tools.tools import draft_email
from langgraph.checkpoint.memory import MemorySaver

class State(BaseModel):
    messages: Annotated[list[AnyMessage], add_messages]
    routed_to: Optional[Literal["gmail", "github"]] = None
    summary:str =""
 
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
def route(agent: Literal["gmail", "github"]) -> str:
    """Hand off the conversation to the given specialist agent."""
    return agent

def github(state:State):
   return {
      "messages":"this is the gmail message of everything is done"
   }

def after_tools(state: State):
    last_msg = state.messages[-1]        # the ToolMessage just produced
    if last_msg.name == "route":
        return last_msg.content          # "gmail" or "github" — route's own return value
    return "supervisor"


def build_graph(mcp_tools: list):
    """Build a graph bound to this request's MCP tools (add_memory/get_memory/delete_memory).

    These come from `mcp_client.get_mcp_tools(jwt)`, which is a per-request connection —
    the tools carry a reference to that connection, so this needs to be called fresh for
    every request, not once at import time.
    """
    GMAIL_TOOL_NAMES = {"list_emails", "get_email", "send_email", "delete_email"}
    gmail_tools = [t for t in mcp_tools if t.name in GMAIL_TOOL_NAMES]+[draft_email]
    supervisor_tools = [t for t in mcp_tools if t.name not in GMAIL_TOOL_NAMES] + [route]

    llm_with_tools = llm.bind_tools(supervisor_tools)       # supervisor never sees gmail tools
    gmail_llm = llm.bind_tools(gmail_tools)
    def supervisor(state: State):
        context = [system_message]
        if state.summary:
            context.append(SystemMessage(content=f"Summary of earlier conversation: {state.summary}"))
        context += state.messages
        response = llm_with_tools.invoke(context)
        return {"messages": [response], "routed_to": None}

    def gmail(state: State):
        context = [gmail_system_message]
        if state.summary:
            context.append(SystemMessage(content=f"Summary of earlier conversation: {state.summary}"))
        context += state.messages
        response = gmail_llm.invoke(context)
        return {"messages": [response]}


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
    builder.add_node("summarize",summarize)
    builder.add_node("github", github)
    builder.add_node("supervisor_tools", ToolNode(supervisor_tools))
    builder.add_node("gmail_tools",ToolNode(gmail_tools))
    builder.add_edge(START, "supervisor")
    builder.add_conditional_edges("supervisor", after_supervisor, {"tools": "supervisor_tools", "summarize": "summarize", END: END})
    builder.add_conditional_edges(
        "supervisor_tools", after_tools, {"gmail": "gmail", "github": "github", "supervisor": "supervisor"}
    )
    builder.add_conditional_edges("gmail", tools_condition, {"tools": "gmail_tools", END: "supervisor"})
    builder.add_edge("gmail_tools", "gmail")
    builder.add_edge("github", "supervisor")
    builder.add_edge("summarize", END)

    return builder.compile(checkpointer=checkpointer)
