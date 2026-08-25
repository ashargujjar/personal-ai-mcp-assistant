# Nexus AI — Personal AI Operating System

A personal assistant app: a chat-first agent (LangGraph + tool-calling) backed by long-term memory, with a frontend surface planned for email, calendar, GitHub, tasks, notes, and more.

## Services

| Service | Stack | Role |
|---|---|---|
| `frontend/` | React + Vite + Tailwind + shadcn | UI — chat page is live end-to-end; other feature pages are scaffolded with mock data |
| `backend/` | Express + Prisma + PostgreSQL | Auth, the `/chat` gateway, and the memory REST API |
| `fastapi/` | FastAPI + LangGraph + LangChain | The conversational agent: routes messages, calls tools, streams responses |
| `mcp/` | FastMCP | Exposes memory tools (`add_memory`/`get_memory`/`delete_memory`) to the agent over MCP |
| `postgres` (docker) | `pgvector/pgvector:pg16` | Relational data + vector similarity search for memory |

## Status

**Completed: the Chat module.** A message sent from the Assistant page flows through Node → FastAPI/LangGraph → MCP → Postgres and streams a real, tool-using response back to the browser, with per-session conversation continuity and semantic long-term memory. Full breakdown of how it works: [docs/chat-module.md](docs/chat-module.md).

**Not yet built:** the `gmail`/`github` specialist nodes are stubs (no real integration behind them yet), and every other frontend page (Email, Calendar, GitHub, Tasks, Notes, Meetings, Files, Voice, etc.) is UI-only against mock data — no backend logic exists for those yet.

## Running it

```
docker compose up
```

Services come up on:
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:4000/api`
- FastAPI agent: `http://localhost:8000`
- MCP server: `http://localhost:8001`

Requires a root `.env` (see the variable table in [docs/chat-module.md](docs/chat-module.md)) with a real `DEEPSEEK_KEY` and `OPENAI_KEY` — the chat module won't function without valid keys for both.

## Docs

- [docs/chat-module.md](docs/chat-module.md) — architecture, request flow, auth model, and known limitations of the chat/memory system.
