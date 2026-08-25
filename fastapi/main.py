from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from fastapi import Depends, FastAPI
from pydantic import BaseModel

from middleware.auth import verify_jwt

app = FastAPI()


class ChatRequest(BaseModel):
    message: str
    stream: bool = True


@app.get("/")
def read_root():
    return {"message": "Hello, World"}

@app.post("/chat")
async def chat(payload: ChatRequest, jwt_token: str = Depends(verify_jwt)):
    result = graph.invoke(
        {"messages": [HumanMessage(content=payload.message)]},
        config={"configurable": {"jwt": jwt_token, "thread_id": ...}},
    )

