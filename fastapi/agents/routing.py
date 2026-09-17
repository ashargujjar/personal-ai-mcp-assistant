from langgraph.prebuilt import tools_condition
from agents.agents import State
def after_gmail(
    state: State,
) -> str:

    result = tools_condition(
        state
    )

    if result == "tools":
        return "tools"

    if state.workflow_mode:
        return "workflow_complete_task"

    return "supervisor"


def after_calender(
    state: State,
) -> str:

    result = tools_condition(
        state
    )

    if result == "tools":
        return "tools"

    if state.workflow_mode:
        return "workflow_complete_task"

    return "supervisor"


def after_task(
    state: State,
) -> str:

    result = tools_condition(
        state
    )

    if result == "tools":
        return "tools"

    if state.workflow_mode:
        return "workflow_complete_task"

    return "supervisor"

def after_pdf(
    state: State,
) -> str:

    if state.workflow_mode:
        return "workflow"

    return "end"