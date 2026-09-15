import json
from datetime import date
from typing import Annotated, Literal, Optional
from langchain_core.messages import AnyMessage, HumanMessage, SystemMessage, ToolMessage
from langgraph.graph import add_messages
from langgraph.types import interrupt
from pydantic import BaseModel, Field
from prompts.prompts import (calendar_system_message, gmail_system_message, system_message,task_system_message,pdf_system_message)


class State(BaseModel):
    messages: Annotated[list[AnyMessage], add_messages]
    user_id: Optional[str] = None
    routed_to: Optional[Literal["gmail", "github", "calender", "task","pdf"]] = None
    summary: str = ""
    timezone: Optional[str] = None
    # Agents that already gave a real (non-blocking) answer this turn — route_guard uses this
    # to stop the supervisor from re-routing to the same agent and getting a duplicate answer.
    # Reset to [] by main.py whenever a fresh HumanMessage starts a new turn.
    visited_agents: list[str] = Field(default_factory=list)
    blocked_repeat_agent: Optional[str] = None
    # "tool_name:json(args)" keys for write tools (create_event, send_email, ...) already executed
    # this turn — make_tools_node uses this to refuse repeating the exact same write instead of
    # re-running it. Reset to [] by main.py whenever a fresh HumanMessage starts a new turn.
    executed_writes: list[str] = Field(default_factory=list)


def github(state: State):
    return {
        "messages": "this is the gmail message of everything is done"
    }


def route_guard(state: State):
    target = state.messages[-1].content
    if target in state.visited_agents:
        return {
            "messages": [SystemMessage(content=(
                f"You already got a full answer from the '{target}' agent for this request — do not call "
                f"route('{target}') again. Either answer the user directly using what it already told you, "
                f"or route to a different agent if part of the request still needs one you haven't tried."
            ))],
            "blocked_repeat_agent": target,
        }
    return {"visited_agents": state.visited_agents + [target], "blocked_repeat_agent": None}


def after_route_guard(state: State) -> str:
    if state.blocked_repeat_agent:
        return "supervisor"
    return state.messages[-1].content

def make_pdf_node(pdf_llm, search_pdf_chunks):
    def pdf_node(state: State):
        question_message = next(
            (message for message in reversed(state.messages)
             if isinstance(message, HumanMessage)),
            None,
        )
        question = question_message.content if question_message else ""
        if not isinstance(question, str) or not question.strip():
            return {
                "messages": [
                    SystemMessage(
                        content="I couldn't identify the document question to answer."
                    )
                ]
            }

        retrieved_chunks = search_pdf_chunks(
            question=question,
            user_id=state.user_id,
        )

        if not retrieved_chunks:
            return {
                "messages": [
                    SystemMessage(
                        content=(
                            "No relevant uploaded-document content was found "
                            "for this question."
                        )
                    )
                ]
            }

        context_parts = []

        for chunk in retrieved_chunks:
            source = (
                f"[Document: {chunk.get('document_title') or 'Untitled PDF'} | "
                f"Pages {chunk['page_start']}-{chunk['page_end']}]"
            )
            context_parts.append(
                f"{source}\n{chunk['text']}"
            )

        context = "\n\n".join(context_parts)

        response = pdf_llm.invoke(
            [
                pdf_system_message,
                SystemMessage(
                    content=(
                        "The retrieval system selected the most relevant uploaded document "
                        "using its title, description, keywords, and filename. "
                        "Retrieved document context:\n\n"
                        f"{context}"
                    )
                ),
                HumanMessage(content=question),
            ]
        )

        return {
            "messages": [response]
        }

    return pdf_node


def make_supervisor_node(llm_with_tools):
    def supervisor(state: State):
        print(state.messages)
        for m in state.messages:
            m.pretty_print()
        context = [system_message]
        if state.timezone:
            context.append(SystemMessage(content=f"The user's timezone is {state.timezone}."))
        if state.summary:
            context.append(SystemMessage(content=f"Summary of earlier conversation: {state.summary}"))
        context += state.messages
        response = llm_with_tools.invoke(context)
        return {"messages": [response], "routed_to": None}

    return supervisor


def make_gmail_node(gmail_llm):
    def gmail(state: State):
        context = [gmail_system_message]
        if state.timezone:
            context.append(SystemMessage(content=f"The user's timezone is {state.timezone}."))
        if state.summary:
            context.append(SystemMessage(content=f"Summary of earlier conversation: {state.summary}"))
        context += state.messages
        response = gmail_llm.invoke(context)
        return {"messages": [response]}

    return gmail


def make_calender_node(calender_llm):
    def calender(state: State):
        context = [calendar_system_message]
        context.append(SystemMessage(content=f"Today's date is {date.today().isoformat()}."))
        if state.timezone:
            context.append(SystemMessage(content=f"The user's timezone is {state.timezone}."))
        if state.summary:
            context.append(SystemMessage(content=f"Summary of earlier conversation: {state.summary}"))
        context += state.messages
        response = calender_llm.invoke(context)
        return {"messages": [response]}

    return calender

def make_task_node(task_llm):
    def taskNode(state:State):
        context=[task_system_message]
        context.append(SystemMessage(content=f"Today's date is {date.today().isoformat()}."))
        if state.timezone:
            context.append(SystemMessage(content=f"The user's timezone is {state.timezone}."))
        if state.summary:
            context.append(SystemMessage(content=f"Summary of earlier conversation: {state.summary}"))
        context += state.messages
        response= task_llm.invoke(context)
        return {"messages": [response]}


    return taskNode



def make_tools_node(tools_by_name, confirm_tools=frozenset(), write_tools=frozenset()):
    """Build a tool-execution node for one specialist's own tool loop.

    `write_tools` are tools with real side effects (create_event, send_email, ...). If the exact
    same write tool + args already succeeded once this turn, it's refused instead of re-run — a
    specialist can otherwise loop on its own (node -> tools -> node) and, on a later pass, decide
    to redo a write it already completed. `confirm_tools` still gates on human approval first.
    """
    async def tools_node(state: State):
        last_msg = state.messages[-1]
        outputs = []
        new_writes = []
        for tool_call in last_msg.tool_calls:
            tool = tools_by_name[tool_call["name"]]
            dedupe_key = f"{tool_call['name']}:{json.dumps(tool_call['args'], sort_keys=True, default=str)}"

            if tool_call["name"] in write_tools and dedupe_key in state.executed_writes:
                result = (
                    f"You already successfully called {tool_call['name']} with these exact arguments "
                    f"earlier in this turn — do not call it again. Use the result you already have to "
                    f"reply to the user instead."
                )
            elif tool_call["name"] in confirm_tools:
                decision = interrupt({"action": tool_call["name"], "args": tool_call["args"]})

                if decision["type"] == "accept":
                    result = await tool.ainvoke(tool_call["args"])
                    if tool_call["name"] in write_tools:
                        new_writes.append(dedupe_key)
                elif decision["type"] == "reject":
                    result = f"User rejected this {tool_call['name']} action. Do not retry it as-is."
                else:
                    result = (
                        f"User did not accept this {tool_call['name']} action as drafted. "
                        f"Their instruction: {decision['message']}"
                    )
            else:
                result = await tool.ainvoke(tool_call["args"])
                if tool_call["name"] in write_tools:
                    new_writes.append(dedupe_key)

            outputs.append(ToolMessage(content=str(result), tool_call_id=tool_call["id"], name=tool_call["name"]))

        return {"messages": outputs, "executed_writes": state.executed_writes + new_writes}

    return tools_node
