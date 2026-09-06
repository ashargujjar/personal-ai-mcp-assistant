from datetime import date
from typing import Annotated, Literal, Optional
from langchain.messages import AnyMessage, SystemMessage, ToolMessage
from langgraph.graph import add_messages
from langgraph.types import interrupt
from pydantic import BaseModel
from prompts.prompts import calendar_system_message, gmail_system_message, system_message,task_system_message


class State(BaseModel):
    messages: Annotated[list[AnyMessage], add_messages]
    routed_to: Optional[Literal["gmail", "github", "calender", "task"]] = None
    summary: str = ""
    timezone: Optional[str] = None


def github(state: State):
    return {
        "messages": "this is the gmail message of everything is done"
    }


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



def make_gmail_tools_node(gmail_tools_by_name, confirm_tools):
    async def gmail_tools_node(state: State):
        last_msg = state.messages[-1]
        outputs = []
        for tool_call in last_msg.tool_calls:
            tool = gmail_tools_by_name[tool_call["name"]]

            if tool_call["name"] in confirm_tools:
                decision = interrupt({"action": tool_call["name"], "args": tool_call["args"]})

                if decision["type"] == "accept":
                    result = await tool.ainvoke(tool_call["args"])
                elif decision["type"] == "reject":
                    result = f"User rejected this {tool_call['name']} action. Do not retry it as-is."
                else:
                    result = (
                        f"User did not accept this {tool_call['name']} action as drafted. "
                        f"Their instruction: {decision['message']}"
                    )
            else:
                result = await tool.ainvoke(tool_call["args"])

            outputs.append(ToolMessage(content=str(result), tool_call_id=tool_call["id"], name=tool_call["name"]))

        return {"messages": outputs}

    return gmail_tools_node


