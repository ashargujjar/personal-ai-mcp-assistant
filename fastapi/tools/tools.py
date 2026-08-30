from langchain.tools import tool
from pydantic import BaseModel
from prompts.prompts import gmail_drafter_agent_prompt
from langchain.messages import HumanMessage
from langchain_deepseek import ChatDeepSeek
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
