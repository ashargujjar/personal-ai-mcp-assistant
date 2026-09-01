from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")
import json
from langgraph.errors import GraphRecursionError
from fastapi import Depends, FastAPI
from langchain.messages import AIMessageChunk, HumanMessage
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
            try:
                async for mode, data in graph.astream(
                    {"messages": [HumanMessage(content=payload.message)]},
                    config={
                        "configurable": {"jwt": jwt_token, "thread_id": payload.threadId},
                        "recursion_limit": 12,
                    },
                    stream_mode=["messages", "updates"],
                ):
                    if mode == "messages":
                        chunk, metadata = data
                        if isinstance(chunk, AIMessageChunk) and isinstance(chunk.content, str) and chunk.content:
                            yield f"data: {json.dumps({'type': 'content', 'content': chunk.content})}\n\n"

                    elif mode == "updates":
                        for node_name, node_output in data.items():
                            if node_name == "supervisor":
                                for msg in node_output.get("messages", []):
                                    for tool_call in getattr(msg, "tool_calls", None) or []:
                                        if tool_call["name"] == "route":
                                            continue
                                        payload_json = {
                                            "type": "tool_call",
                                            "tool": tool_call["name"],
                                            "status": "running",
                                        }
                                        yield f"data: {json.dumps(payload_json)}\n\n"

                            elif node_name in ("supervisor_tools", "gmail_tools"):
                                for msg in node_output.get("messages", []):
                                    tool_name = getattr(msg, "name", None)
                                    if not tool_name or tool_name == "route":
                                        continue
                                    payload_json = {
                                        "type": "tool_call",
                                        "tool": tool_name,
                                        "status": "done",
                                    }
                                    yield f"data: {json.dumps(payload_json)}\n\n"

            except GraphRecursionError:
                fallback = "I'm having trouble completing this, can you clarify?"
                yield f"data: {json.dumps({'type': 'content', 'content': fallback})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
