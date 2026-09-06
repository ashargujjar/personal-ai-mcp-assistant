import os
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

import httpx
from fastmcp import FastMCP
from fastmcp.server.dependencies import get_http_headers
from langchain_openai import OpenAIEmbeddings
import re

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
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
        if response.is_error:
            raise httpx.HTTPStatusError(
                f"{response.status_code} for {method} {path}: {response.text}",
                request=response.request, response=response,
            )
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
    if not EMAIL_RE.match(to.strip()):
         raise ValueError(
            f"'{to}' is not a valid email address. Ask the user for the correct recipient "
            "instead of guessing."
        )
    jwt = _get_jwt()
    result = await _request("POST", "/gmail/send", jwt, {"to": to, "subject": subject, "body": body})
    return f"Email sent (id: {result['data']['id']})."


@mcp.tool()
async def delete_email(message_id: str) -> str:
    """Move an email to trash by its id, from list_emails results."""
    jwt = _get_jwt()
    await _request("DELETE", f"/gmail/messages/{message_id}", jwt)
    return f"Deleted email {message_id}."


@mcp.tool()
async def check_calendar_connection_status() -> str:
    """Checks whether the user's Google Calendar is connected."""
    jwt = _get_jwt()
    result = await _request("GET", "/calendar/status", jwt)
    connected = result["data"]["connected"]
    return "Calendar is connected." if connected else "Calendar is not connected."


@mcp.tool()
async def list_events() -> str:
    """List the user's next 10 upcoming Calendar events (id, title, start, end, location, attendees)."""
    jwt = _get_jwt()
    result = await _request("GET", "/calendar/events", jwt)
    events = result["data"]
    if not events:
        return "No upcoming events found."
    return "\n".join(
        f"- [{e['id']}] {e['title']} | {e['start']} to {e['end']}"
        f"{' | ' + e['location'] if e.get('location') else ''}"
        f"{' | attendees: ' + ', '.join(e['attendees']) if e.get('attendees') else ''}"
        for e in events
    )


@mcp.tool()
async def get_event(event_id: str) -> str:
    """Get the full details of a single Calendar event by its id, from list_events results."""
    jwt = _get_jwt()
    result = await _request("GET", f"/calendar/events/{event_id}", jwt)
    e = result["data"]
    lines = [f"Title: {e['title']}", f"Start: {e['start']}", f"End: {e['end']}"]
    if e.get("location"):
        lines.append(f"Location: {e['location']}")
    if e.get("attendees"):
        lines.append(f"Attendees: {', '.join(e['attendees'])}")
    if e.get("description"):
        lines.append(f"\n{e['description']}")
    return "\n".join(lines)


@mcp.tool()
async def create_event(title: str, start: str, end: str, description: Optional[str] = None,
                        attendees: Optional[list[str]] = None) -> str:
    """Create a Calendar event. `start` and `end` must be ISO 8601 datetimes (e.g. '2026-09-05T14:00:00-07:00').
    `attendees` is an optional list of email addresses."""
    jwt = _get_jwt()
    payload = {"title": title, "start": start, "end": end}
    if description is not None:
        payload["description"] = description
    if attendees is not None:
        payload["attendees"] = attendees
    result = await _request("POST", "/calendar/events", jwt, payload)
    return f"Event created (id: {result['data']['id']})."


@mcp.tool()
async def delete_event(event_id: str) -> str:
    """Delete a Calendar event by its id, from list_events results."""
    jwt = _get_jwt()
    await _request("DELETE", f"/calendar/events/{event_id}", jwt)
    return f"Deleted event {event_id}."


@mcp.tool()
async def list_tasks() -> str:
    """List the user's tasks (id, title, status, priority, deadline, project, source)."""
    jwt = _get_jwt()
    result = await _request("GET", "/tasks", jwt)
    tasks = result["data"]
    if not tasks:
        return "No tasks found."
    return "\n".join(
        f"- [{t['id']}] {t['title']} | status: {t['status']} | priority: {t['priority']}"
        f"{' | due: ' + t['deadline'] if t.get('deadline') else ''}"
        f"{' | project: ' + t['project'] if t.get('project') else ''}"
        for t in tasks
    )


@mcp.tool()
async def get_task(task_id: str) -> str:
    """Get the full details of a single task by its id, from list_tasks results."""
    jwt = _get_jwt()
    result = await _request("GET", f"/tasks/{task_id}", jwt)
    t = result["data"]
    lines = [f"Title: {t['title']}", f"Status: {t['status']}", f"Priority: {t['priority']}"]
    if t.get("deadline"):
        lines.append(f"Deadline: {t['deadline']}")
    if t.get("project"):
        lines.append(f"Project: {t['project']}")
    if t.get("source"):
        lines.append(f"Source: {t['source']}")
    if t.get("description"):
        lines.append(f"\n{t['description']}")
    return "\n".join(lines)


@mcp.tool()
async def create_task(title: str, description: Optional[str] = None, priority: Optional[str] = None,
                       deadline: Optional[str] = None, project: Optional[str] = None) -> str:
    """Create a task. `priority` is one of low/medium/high/urgent (default medium). `deadline` must be
    an ISO 8601 datetime if given — do not guess one the user hasn't stated. `project` is a free-text
    label for what the task relates to (e.g. a client name or repo, like 'Bright Client' or 'auth-service')."""
    jwt = _get_jwt()
    payload = {"title": title, "source": "ai"}
    if description is not None:
        payload["description"] = description
    if priority is not None:
        payload["priority"] = priority
    if deadline is not None:
        payload["deadline"] = deadline
    if project is not None:
        payload["project"] = project
    result = await _request("POST", "/tasks", jwt, payload)
    return f"Task created (id: {result['data']['id']})."


@mcp.tool()
async def update_task(task_id: str, title: Optional[str] = None, description: Optional[str] = None,
                       priority: Optional[str] = None, deadline: Optional[str] = None,
                       project: Optional[str] = None, status: Optional[str] = None) -> str:
    """Update a task by its id, from list_tasks results. Only the fields you pass are changed.
    `status` is one of todo/in-progress/waiting/done — use this to mark a task done."""
    jwt = _get_jwt()
    payload = {}
    if title is not None:
        payload["title"] = title
    if description is not None:
        payload["description"] = description
    if priority is not None:
        payload["priority"] = priority
    if deadline is not None:
        payload["deadline"] = deadline
    if project is not None:
        payload["project"] = project
    if status is not None:
        payload["status"] = status
    await _request("PATCH", f"/tasks/{task_id}", jwt, payload)
    return f"Task {task_id} updated."


@mcp.tool()
async def delete_task(task_id: str) -> str:
    """Delete a task by its id, from list_tasks results."""
    jwt = _get_jwt()
    await _request("DELETE", f"/tasks/{task_id}", jwt)
    return f"Deleted task {task_id}."


if __name__ == "__main__":
    mcp.run(
        transport="streamable-http",
        host="0.0.0.0",
        port=8000
    )
