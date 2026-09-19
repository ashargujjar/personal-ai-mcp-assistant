import json
from datetime import date
from typing import Annotated, Literal, Optional,Any
from langchain_core.messages import AnyMessage, HumanMessage, SystemMessage, ToolMessage
from langgraph.graph import add_messages
from langgraph.types import interrupt
from pydantic import BaseModel, Field
from prompts.prompts import (calendar_system_message, gmail_system_message, system_message,task_system_message,pdf_system_message)

class WorkflowCondition(BaseModel):
    field:str
    operator: Literal[ "equals",
        "not_equals",
        "exists",
        "not_exists",
        "gt",
        "gte",
        "lt",
        "lte",]
    value:Any= None

class workflowTask(BaseModel):
    id:str
    agent: Literal[
         "gmail",
        "github",
        "calender",
        "task",
        "pdf",
    ]
    instruction:str
    depends_on: list[str] = Field(
        default_factory=list
    )
    condition: Optional[WorkflowCondition] = None
    status: Literal[
        "pending",
        "running",
        "completed",
        "skipped",
        "failed",
    ] = "pending"
    result: dict[str, Any] = Field(
        default_factory=dict
    )
class WorkflowPlan(BaseModel):
    tasks: list[workflowTask]

class PDFWorkflowExtraction(BaseModel):
    data: dict[str, Any] = Field(
        default_factory=dict
    )

    explanation: str = ""

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
# my agwnt workflow state--
    workflow_mode:bool=False
    workflow_tasks: list[workflowTask]=Field(
        default_factory=dict
    )
    workflow_context: dict[str, Any] = Field(
        default_factory=dict
    )

    current_task_id: Optional[str] = None


def complete_current_task(
    state: State,
    result: Optional[dict] = None,
):

    if not state.current_task_id:
        return {}

    tasks = [
        task.model_copy(deep=True)
        for task in state.workflow_tasks
    ]

    for task in tasks:

        if (
            task.id
            == state.current_task_id
        ):
            task.status = "completed"

            task.result = (
                result or {}
            )

            break

    return {
        "workflow_tasks": tasks,
        "current_task_id": None,
    }
def gmail_workflow_complete(
    state: State,
):

    latest_message = (
        state.messages[-1]
        if state.messages
        else None
    )

    result = {
        "response": (
            latest_message.content
            if latest_message
            else ""
        )
    }

    return complete_current_task(
        state,
        result,
    )
def calender_workflow_complete(
    state: State,
):

    latest_message = (
        state.messages[-1]
        if state.messages
        else None
    )

    return complete_current_task(
        state,
        {
            "response": (
                latest_message.content
                if latest_message
                else ""
            )
        },
    )

def task_workflow_complete(
    state: State,
):

    latest_message = (
        state.messages[-1]
        if state.messages
        else None
    )

    return complete_current_task(
        state,
        {
            "response": (
                latest_message.content
                if latest_message
                else ""
            )
        },
    )
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


def make_planner_node(planner_llm):

    def planner(state: State):

        # Find latest actual HumanMessage
        user_message = next(
            (
                msg
                for msg in reversed(state.messages)
                if isinstance(msg, HumanMessage)
            ),
            None,
        )

        if user_message is None:
            return {
                "workflow_mode": False,
                "workflow_tasks": [],
            }

        planner_prompt = SystemMessage(
            content="""
You are the workflow planner of a personal AI assistant.

Your job is ONLY to produce a structured workflow plan.
Do not execute tools.

Available specialists:

pdf
- retrieve information from uploaded documents
- extract values required by later tasks

gmail
- list/read/send/delete emails

calender
- list/get/create/delete calendar events

task
- list/create/update/delete tasks

github
- GitHub operations


Rules:

1. Create the minimum number of tasks needed.

2. If one task needs another task's output,
use depends_on.

3. For conditional requests use a structured condition.

Example:

User:
"Check my PDF and if my grade is A send
a congratulations email and add the
convocation date to my calendar."

Plan:

Task 1
agent: pdf
instruction:
"Extract grade and convocation_date"
depends_on: []

Task 2
agent: gmail
instruction:
"Send the requested congratulations email"
depends_on: ["1"]
condition:
 field: grade
 operator: equals
 value: A

Task 3
agent: calender
instruction:
"Create the convocation event using convocation_date"
depends_on: ["1"]
condition:
 field: convocation_date
 operator: exists


Important:

- Do not invent document values.
- Do not execute actions.
- Conditions may reference fields generated by earlier tasks.
- Make task IDs simple strings: "1", "2", "3".
"""
        )

        plan = planner_llm.invoke(
            [
                planner_prompt,
                user_message,
            ]
        )

        return {
            "workflow_mode": True,
            "workflow_tasks": plan.tasks,
            "workflow_context": {},
            "current_task_id": None,
        }

    return planner
def get_workflow_task(
    state: State,
    task_id: str,
) -> Optional[workflowTask]:

    for task in state.workflow_tasks:
        if task.id == task_id:
            return task

    return None
# get the current workflow task
def get_current_workflow_task(
    state: State,
) -> Optional[workflowTask]:

    if not state.current_task_id:
        return None

    return get_workflow_task(
        state,
        state.current_task_id,
    )

# condition node

def evaluate_workflow_condition(
    condition: Optional[WorkflowCondition],
    context: dict,
) -> bool:

    if condition is None:
        return True

    actual = context.get(
        condition.field
    )

    expected = condition.value

    if condition.operator == "equals":
        return actual == expected

    if condition.operator == "not_equals":
        return actual != expected

    if condition.operator == "exists":
        return actual is not None

    if condition.operator == "not_exists":
        return actual is None

    if condition.operator == "gt":
        return (
            actual is not None
            and actual > expected
        )

    if condition.operator == "gte":
        return (
            actual is not None
            and actual >= expected
        )

    if condition.operator == "lt":
        return (
            actual is not None
            and actual < expected
        )

    if condition.operator == "lte":
        return (
            actual is not None
            and actual <= expected
        )

    return False


#  next workflow task
def prepare_next_workflow_task(
    state: State,
):

    tasks = [
        task.model_copy(deep=True)
        for task in state.workflow_tasks
    ]

    context = state.workflow_context

    # Find next eligible task
    for task in tasks:

        if task.status != "pending":
            continue

        dependencies = []

        for dependency_id in task.depends_on:

            dependency = next(
                (
                    t
                    for t in tasks
                    if t.id == dependency_id
                ),
                None,
            )

            dependencies.append(
                dependency
            )

        # Failed dependency
        if any(
            dependency is None
            or dependency.status == "failed"
            for dependency in dependencies
        ):
            task.status = "skipped"
            continue

        # Dependency still not completed
        if not all(
            dependency.status == "completed"
            for dependency in dependencies
        ):
            continue

        # Dependencies completed,
        # now evaluate condition.
        condition_ok = (
            evaluate_workflow_condition(
                task.condition,
                context,
            )
        )

        if not condition_ok:
            task.status = "skipped"
            continue

        # This is next task
        task.status = "running"

        return {
            "workflow_tasks": tasks,
            "current_task_id": task.id,
        }

    # Nothing left
    return {
        "workflow_tasks": tasks,
        "current_task_id": None,
    }

def route_workflow(
    state: State,
) -> str:

    if not state.current_task_id:
        return "complete"

    task = get_current_workflow_task(
        state
    )

    if task is None:
        return "complete"

    return task.agent

def make_pdf_node(pdf_llm, search_pdf_chunks):
    def pdf_node(state: State):
        question_message = next(
            (
                message
                for message in reversed(state.messages)
                if isinstance(message, HumanMessage)
            ),
            None,
        )

        question = (
            question_message.content
            if question_message
            else ""
        )

        if not isinstance(question, str) or not question.strip():
            return {
                "messages": [
                    SystemMessage(
                        content=(
                            "I couldn't identify the document question to answer."
                        )
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
                f"[Document: "
                f"{chunk.get('document_title') or 'Untitled PDF'} | "
                f"Pages {chunk['page_start']}-{chunk['page_end']}]"
            )

            context_parts.append(
                f"{source}\n{chunk['text']}"
            )

        context = "\n\n".join(context_parts)

        # -----------------------------------------
        # WORKFLOW MODE
        # -----------------------------------------
        if state.workflow_mode:
            workflow_task = get_current_workflow_task(
                state
            )

            if workflow_task is None:
                return {
                    "messages": [
                        SystemMessage(
                            content=(
                                "No active PDF workflow task was found."
                            )
                        )
                    ]
                }

            structured_pdf_llm = (
                pdf_llm.with_structured_output(
                    PDFWorkflowExtraction
                )
            )

            extraction = structured_pdf_llm.invoke(
                [
                    pdf_system_message,

                    SystemMessage(
                        content=f"""
You are executing one PDF task inside a larger workflow.

CURRENT TASK:
{workflow_task.instruction}

Your job is to extract structured information
from the retrieved document context.

Return only fields required by the current task
inside the `data` object.

Examples:

If the task asks for grade and convocation date:

{{
    "data": {{
        "grade": "A",
        "convocation_date": "2026-12-20"
    }},
    "explanation": "The document shows grade A and the convocation date."
}}

If the task asks for invoice information:

{{
    "data": {{
        "invoice_total": 52000,
        "due_date": "2026-10-10"
    }},
    "explanation": "The invoice total and due date were found."
}}

Rules:

- Do not invent values.
- If a requested value is not available, use null.
- Use concise field names.
- Dates should use YYYY-MM-DD when possible.
- Numbers should be returned as numbers, not formatted strings.
"""
                    ),

                    SystemMessage(
                        content=(
                            "Retrieved document context:\n\n"
                            f"{context}"
                        )
                    ),

                    HumanMessage(
                        content=question
                    ),
                ]
            )

            new_workflow_context = {
                **state.workflow_context,
                **extraction.data,
            }

            updated_tasks = [
                task.model_copy(deep=True)
                for task in state.workflow_tasks
            ]

            for task in updated_tasks:
                if task.id == state.current_task_id:
                    task.status = "completed"
                    task.result = extraction.data
                    break

            return {
                "workflow_context": new_workflow_context,
                "workflow_tasks": updated_tasks,
                "current_task_id": None,
                "messages": [
                    SystemMessage(
                        content=(
                            extraction.explanation
                            or "PDF workflow extraction completed."
                        )
                    )
                ],
            }

        # -----------------------------------------
        # NORMAL CHAT MODE
        # -----------------------------------------
        response = pdf_llm.invoke(
            [
                pdf_system_message,

                SystemMessage(
                    content=(
                        "The retrieval system selected the most relevant "
                        "uploaded document using its title, description, "
                        "keywords, and filename. "
                        "Retrieved document context:\n\n"
                        f"{context}"
                    )
                ),

                HumanMessage(
                    content=question
                ),
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

        context = [
            gmail_system_message
        ]

        if state.workflow_mode:

            workflow_task = (
                get_current_workflow_task(
                    state
                )
            )

            if workflow_task:
                context.append(
                    SystemMessage(
                        content=f"""
You are currently executing ONE task
inside a larger workflow.

CURRENT TASK:
{workflow_task.instruction}

WORKFLOW CONTEXT:
{json.dumps(
    state.workflow_context,
    indent=2,
    default=str
)}

Only handle this task.

Do not try to complete other workflow
tasks yourself.
"""
                    )
                )

        if state.timezone:
            context.append(
                SystemMessage(
                    content=(
                        f"The user's timezone is "
                        f"{state.timezone}."
                    )
                )
            )

        if state.summary:
            context.append(
                SystemMessage(
                    content=(
                        "Summary of earlier "
                        f"conversation: {state.summary}"
                    )
                )
            )

        context += state.messages

        response = gmail_llm.invoke(
            context
        )

        return {
            "messages": [response]
        }

    return gmail


def make_calender_node(calender_llm):
    def calender(state: State):
        context = [calendar_system_message]
        context.append(SystemMessage(content=f"Today's date is {date.today().isoformat()}."))
        if state.timezone:
            context.append(SystemMessage(content=f"The user's timezone is {state.timezone}."))
        if state.summary:
            context.append(SystemMessage(content=f"Summary of earlier conversation: {state.summary}"))
        if state.workflow_mode:

            workflow_task = (
                get_current_workflow_task(
                    state
                )
            )

            if workflow_task:
                context.append(
                    SystemMessage(
                        content=f"""
        You are executing one task inside
        a larger workflow.

        CURRENT TASK:
        {workflow_task.instruction}

        WORKFLOW CONTEXT:
        {json.dumps(
            state.workflow_context,
            indent=2,
            default=str
        )}

        Use workflow_context values when
        required by the task.

        Only complete this task.
        """
                    )
                )       
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
        if state.workflow_mode:

            workflow_task = (
                get_current_workflow_task(
                    state
                )
            )

            if workflow_task:
                context.append(
                    SystemMessage(
                        content=f"""
        You are executing one task inside
        a larger workflow.

        CURRENT TASK:
        {workflow_task.instruction}

        WORKFLOW CONTEXT:
        {json.dumps(
            state.workflow_context,
            indent=2,
            default=str
        )}

        Only perform this task.
        """
                    )
                )
        context += state.messages
        response= task_llm.invoke(context)
        return {"messages": [response]}


    return taskNode
def make_workflow_finalizer(
    llm
):

    def workflow_finalizer(
        state: State,
    ):

        completed = []
        skipped = []
        failed = []

        for task in state.workflow_tasks:

            info = {
                "id": task.id,
                "agent": task.agent,
                "instruction":
                    task.instruction,
                "result":
                    task.result,
            }

            if task.status == "completed":
                completed.append(info)

            elif task.status == "skipped":
                skipped.append(info)

            elif task.status == "failed":
                failed.append(info)

        prompt = SystemMessage(
            content=f"""
A multi-step workflow has finished.

WORKFLOW CONTEXT:
{json.dumps(
    state.workflow_context,
    indent=2,
    default=str
)}

COMPLETED TASKS:
{json.dumps(
    completed,
    indent=2,
    default=str
)}

SKIPPED TASKS:
{json.dumps(
    skipped,
    indent=2,
    default=str
)}

FAILED TASKS:
{json.dumps(
    failed,
    indent=2,
    default=str
)}

Give the user one concise final response.

Clearly distinguish:
- actions completed
- actions skipped
- actions failed

Never claim an external action happened
unless its task status is completed.
"""
        )

        response = llm.invoke(
            [prompt]
        )

        return {
            "messages": [response],

            "workflow_mode": False,

            "workflow_tasks": [],

            "workflow_context": {},

            "current_task_id": None,
        }

    return workflow_finalizer


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
                tool_args = tool_call["args"]
                if tool_call["name"] == "get_current_timezone":
                    tool_args = {**tool_args, "state": state}
                result = await tool.ainvoke(tool_args)
                if tool_call["name"] in write_tools:
                    new_writes.append(dedupe_key)

            outputs.append(ToolMessage(content=str(result), tool_call_id=tool_call["id"], name=tool_call["name"]))

        return {"messages": outputs, "executed_writes": state.executed_writes + new_writes}

    return tools_node
