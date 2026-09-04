from typing import Annotated, Any
from langchain.tools import tool
from pydantic import BaseModel
from prompts.prompts import gmail_drafter_agent_prompt
from langchain.messages import HumanMessage
from langchain_deepseek import ChatDeepSeek
from langgraph.prebuilt import InjectedState
import os
import json
class GmailOutput(BaseModel):
    subject: str
    body: str
    
llm=ChatDeepSeek(
   model= "deepseek-chat",
  api_key=os.environ["DEEPSEEK_KEY"],
  temperature=0.2
)
    
structured_llm=llm.with_structured_output(GmailOutput)
@tool
def draft_email(to:str ,instructions: str) -> str:
    """Draft the subject and body of an email based on instructions. Does not send anything."""
    draft = structured_llm.invoke([gmail_drafter_agent_prompt, HumanMessage(content=instructions)])
    # ask the drafter LLM to produce subject/body as JSON, or parse/split it here
    return json.dumps({"to": to, "subject": draft.subject, "body": draft.body})


@tool
def get_current_timezone(state: Annotated[Any, InjectedState]) -> str:
    """Get the user's current IANA timezone (e.g. 'Asia/Karachi'), as reported by their browser.
    Call this before building an ISO 8601 datetime instead of asking the user for their timezone."""
    timezone = state.get("timezone") if isinstance(state, dict) else getattr(state, "timezone", None)
    if not timezone:
        return "Unknown — the user's timezone was not provided. Ask them for it directly."
    return timezone
