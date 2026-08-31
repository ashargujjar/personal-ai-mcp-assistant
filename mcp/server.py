import os
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

import httpx
from fastmcp import FastMCP
from fastmcp.server.dependencies import get_http_headers
from langchain_openai import OpenAIEmbeddings

mcp = FastMCP("Personal Assistant mcp")

NODE_URL = os.environ["NODE_URL"]

embeddings = OpenAIEmbeddings(model="text-embedding-3-small", api_key=os.environ["OPENAI_KEY"])


def _get_jwt() -> str:
    headers = get_http_headers(include={"authorization"})
    authorization = headers.get("authorization")
    if not authorization or not authorization.startswith("Bearer "):
        raise ValueError("Missing Authorization header")
    return authorization.removeprefix("Bearer ")


async def _request(method: str, path: str, jwt: str, json: Optional[dict] = None) -> dict:
    async with httpx.AsyncClient(base_url=NODE_URL, headers={"Authorization": f"Bearer {jwt}"}) as client:
        response = await client.request(method, path, json=json)
        response.raise_for_status()
        return response.json() if response.content else {}


@mcp.tool()
async def add_memory(content: str, type: str, key: Optional[str] = None,
                      metadata: Optional[dict] = None) -> str:
    """Save a fact about the user to long-term memory, keyed by topic (e.g. 'favorite_language')."""
    jwt = _get_jwt()
    embedding = await embeddings.aembed_query(content)
    result = await _request(
        "POST", "/memory", jwt,
        {"type": type, "key": key, "content": content, "metadata": metadata, "embedding": embedding},
    )
    return f"Saved: {result['data']['content']}"


@mcp.tool()
async def get_memory(query: str, limit: int = 4) -> str:
    """Search long-term memory for facts relevant to a query. Returns the most similar stored memories."""
    jwt = _get_jwt()
    embedding = await embeddings.aembed_query(query)
    result = await _request("POST", "/memory/search", jwt, {"embedding": embedding, "limit": limit})
    memories = result["data"]
    if not memories:
        return "No relevant memories found."
    return "\n".join(f"- [{m['id']}] {m['content']}" for m in memories)


@mcp.tool()
async def get_memory_by_key(key: str) -> str:
    """Get the current value of a known fact slot (e.g. 'favorite_language', 'job_title') by its exact key.
    Use this instead of get_memory when you already know the slot name and want the single current value."""
    jwt = _get_jwt()
    result = await _request("GET", f"/memory/key/{key}", jwt)
    memory = result["data"]
    if not memory:
        return f"No memory found for key '{key}'."
    return memory["content"]


@mcp.tool()
async def delete_memory(memory_id: str) -> str:
    """Delete a previously saved fact from long-term memory by its memory id (from get_memory results)."""
    jwt = _get_jwt()
    await _request("DELETE", f"/memory/{memory_id}", jwt)
    return f"Deleted: {memory_id}"

@mcp.tool()
async def check_gmail_connection_status() -> str:
    """Checks whether the user's Gmail account is connected."""
    jwt = _get_jwt()
    result = await _request("GET", "/gmail/status", jwt)
    connected = result["data"]["connected"]
    return "Gmail is connected." if connected else "Gmail is not connected."

@mcp.tool()
async def list_emails() -> str:
    """List the user's most recent Gmail messages (id, sender, subject, date, snippet)."""
    jwt = _get_jwt()
    result = await _request("GET", "/gmail/messages", jwt)
    messages = result["data"]
    if not messages:
        return "No emails found."
    return "\n".join(
        f"- [{m['id']}] From: {m['from']} | Subject: {m['subject']} | Date: {m['date']} | {m['snippet']}"
        for m in messages
    )


@mcp.tool()
async def get_email(message_id: str) -> str:
    """Get the full content (headers + body) of a single email by its id, from list_emails results."""
    jwt = _get_jwt()
    result = await _request("GET", f"/gmail/messages/{message_id}", jwt)
    m = result["data"]
    return (
        f"From: {m['from']}\nTo: {m['to']}\nSubject: {m['subject']}\nDate: {m['date']}\n\n{m['body']}"
    )


@mcp.tool()
async def send_email(to: str, subject: str, body: str) -> str:
    """Send an email on the user's behalf."""
    jwt = _get_jwt()
    result = await _request("POST", "/gmail/send", jwt, {"to": to, "subject": subject, "body": body})
    return f"Email sent (id: {result['data']['id']})."


@mcp.tool()
async def delete_email(message_id: str) -> str:
    """Move an email to trash by its id, from list_emails results."""
    jwt = _get_jwt()
    await _request("DELETE", f"/gmail/messages/{message_id}", jwt)
    return f"Deleted email {message_id}."


if __name__ == "__main__":
    mcp.run(
        transport="streamable-http",
        host="0.0.0.0",
        port=8000
    )
