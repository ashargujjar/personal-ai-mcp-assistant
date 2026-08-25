import os
from langchain.messages import AIMessage,HumanMessage,SystemMessage,AnyMessage
from langgraph.graph import add_messages,StateGraph,START,END
from langchain_deepseek import ChatDeepSeek
from typing import Annotated,Literal,List,Optional
from pydantic import BaseModel,Field
from langchain.tools import tool
from langgraph.prebuilt import ToolNode, tools_condition
class State(BaseModel):
    messages: Annotated[list[AnyMessage], add_messages]
    routed_to: Optional[Literal["gmail", "github"]] = None
from langgraph.checkpoint.memory import MemorySaver

# tools all bind to supervisor for memory
llm=ChatDeepSeek(
   model= "deepseek-chat",
  api_key=os.environ["DEEPSEEK_KEY"],
  temperature=0.2
)
checkpointer = MemorySaver()

system_message=SystemMessage(content=(
   "You are a supervisor that manages two specialist agents (gmail, github) and the user's long-term memory. "
   "You have four tools:\n"
   "- get_memory(query, limit=4): search long-term memory for facts relevant to a query, returning the "
   "most similar stored memories along with their memory id. Always search before answering questions "
   "about the user's preferences or past statements, and before calling add_memory, so you don't save "
   "duplicate facts.\n"
   "- add_memory(content, type, key=None, metadata=None): save a new fact to long-term memory. There is "
   "no automatic overwrite — if the user contradicts something already stored (e.g. first says they love "
   "JavaScript, later says they only like Python), just add the new fact as a separate memory; do not try "
   "to edit the old one.\n"
   "- delete_memory(memory_id): remove a saved fact when the user asks you to forget something. You must "
   "call get_memory first to find the memory id, then pass that id here — you cannot delete by name or key.\n"
   "- route(agent): hand off to 'gmail' or 'github' when the request needs that specialist. "
   "Do not call route for general questions or conversation — answer those directly with plain text instead.\n\n"
   "After a specialist agent responds, check whether the user's request was fully completed. "
   "If not, call route again for that same agent. If it is complete, reply to the user directly "
   "with the relevant result — do not call route again.\n\n"
   "Personalize your answers using what you know about the user when it's relevant."
))

@tool
def route(agent: Literal["gmail", "github"]) -> str:
    """Hand off the conversation to the given specialist agent."""
    return agent

def gmail(state:State):
  return{
         "messages":"all user operations have done succesfully",
        }

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
    tools = [*mcp_tools, route]
    llm_with_tools = llm.bind_tools(tools)

    def supervisor(state: State):
        response = llm_with_tools.invoke([system_message, *state.messages])
        return {"messages": [response], "routed_to": None}

    builder = StateGraph(State)
    builder.add_node("supervisor", supervisor)
    builder.add_node("gmail", gmail)
    builder.add_node("github", github)
    builder.add_node("tools", ToolNode(tools))

    builder.add_edge(START, "supervisor")
    builder.add_conditional_edges("supervisor", tools_condition)
    builder.add_conditional_edges(
        "tools", after_tools, {"gmail": "gmail", "github": "github", "supervisor": "supervisor"}
    )

    builder.add_edge("gmail", "supervisor")
    builder.add_edge("github", "supervisor")
    return builder.compile(checkpointer=checkpointer)
