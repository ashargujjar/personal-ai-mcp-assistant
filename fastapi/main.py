from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")
import json
from fastapi import Depends, FastAPI
from langchain.messages import HumanMessage
from pydantic import BaseModel,Field
from fastapi.responses import StreamingResponse
from chat import build_graph
from mcp_client import get_mcp_tools
from middleware.auth import verify_jwt

app = FastAPI()


class ChatRequest(BaseModel):
    message: str=Field(max_length=500)
    threadId: str
    stream: bool = True


@app.get("/")
def read_root():
    return {"message": "Hello, World"}

@app.post("/chat")
async def chat(payload: ChatRequest, jwt_token: str = Depends(verify_jwt)):
    async def event_stream():
        async with get_mcp_tools(jwt_token) as mcp_tools:
            graph = build_graph(mcp_tools)
            async for chunk,metadata in graph.astream(
                {"messages": [HumanMessage(content=payload.message)]},
                config={"configurable": {"jwt": jwt_token, "thread_id": payload.threadId}},
            ):
                if chunk.content:
                    yield f"data: {json.dumps({'content': chunk.content})}\n\n"

    return  StreamingResponse(event_stream(),media_type="text/event-stream")
