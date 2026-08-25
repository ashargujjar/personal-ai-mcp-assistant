# Chat Module

The end-to-end conversational assistant: frontend chat UI → Node API → FastAPI/LangGraph agent → MCP memory tools → Postgres (pgvector). This document covers what's built and how the pieces fit together.

## Architecture

```
Frontend (Assistant.tsx)
   │  POST /api/chat  { chatText, threadId }  +  Authorization: Bearer <jwt>
   ▼
Node (chatAssistant controller)
   │  POST /chat  { message, threadId, stream: true }  +  same Authorization header
   ▼
FastAPI (main.py)
   │  verify_jwt → open MCP connection scoped to this JWT → build LangGraph graph
   │  graph.astream(...) → StreamingResponse (SSE) back through Node to the browser
   ▼
LangGraph (chat.py)
   │  supervisor node (DeepSeek LLM + tools) ⇄ tools node ⇄ gmail/github stub nodes
   │  MemorySaver checkpointer, keyed by thread_id
   ▼
MCP server (mcp/server.py)
   │  add_memory / get_memory / delete_memory
   │  reads caller's JWT from the HTTP request, embeds text via OpenAI
   ▼
Node memory API (memory.controller.ts)
   │  CRUD + cosine-similarity search, scoped by userId
   ▼
Postgres + pgvector (Memory model)
```

## Request flow

1. **Frontend** generates a random `threadId` (`crypto.randomUUID()`) once per page load, and again whenever "new chat" is triggered. It's held in React state only — never persisted to storage — so closing or reloading the tab starts a fresh conversation.
2. `assistantService.sendMessage` posts `{ chatText, threadId }` to Node's `/api/chat`, then reads the response body as a stream, parsing `data: {...}\n\n` (SSE) frames incrementally and updating the assistant's message content live as tokens arrive.
3. **Node** (`chat.routes.ts`) runs the request through `chatLimiter` (rate limit) → `requireAuth` (JWT check, populates `req.user`) → `validate(chatSchema)` (length/shape validation) → `chatAssistant`, which forwards `{ message, threadId, stream: true }` to FastAPI with the same `Authorization` header, and pipes FastAPI's response straight back to the client byte-for-byte (no buffering).
4. **FastAPI** (`main.py`) verifies the JWT itself via the `verify_jwt` dependency (signature + expiry, `PyJWT`, `HS256`), then opens a per-request MCP connection (`get_mcp_tools`) with that JWT forwarded as an HTTP header, builds a LangGraph graph bound to the resulting tools, and streams the run via `graph.astream(...)` wrapped in a `StreamingResponse`.
5. **LangGraph** (`chat.py`) runs `supervisor` (DeepSeek, tools bound: MCP tools + local `route` tool) in a loop with a `ToolNode`, routing to `gmail`/`github` stub nodes when the model calls `route`. A `MemorySaver` checkpointer (module-level singleton) persists `state.messages` keyed by `thread_id`, giving the LLM memory of earlier turns within the same browser session.
6. When the model calls `add_memory`/`get_memory`/`delete_memory`, those calls go out over the MCP connection to **mcp-server**, which reads the caller's JWT from the live HTTP request (`get_http_headers(include={"authorization"})` — FastMCP strips `Authorization` by default, so this is an explicit opt-in), computes embeddings via OpenAI's `text-embedding-3-small` where needed, and calls Node's `/api/memory` REST endpoints with that same JWT.
7. **Node's memory API** (`memory.controller.ts`) validates via Zod, enforces per-user ownership on update/delete, and reads/writes the `Memory` table — including raw parameterized SQL for the `vector(1536)` column, which Prisma Client can't touch directly (`Unsupported` type), and cosine-distance search (`<=>`) for `get_memory`.

## Auth model

- One shared `JWT_SECRET` (HS256) across Node and FastAPI — Node signs it at login, FastAPI verifies it independently.
- The JWT is **never exposed to the LLM's tool schema**. It's threaded through `RunnableConfig` for in-process nodes and through HTTP headers for the out-of-process MCP hop — the model can call `add_memory`/`get_memory` without ever seeing or handling the token itself.
- Every service that touches the token (`chatAssistant`, FastAPI's `verify_jwt`, Node's `requireAuth` on the memory routes) verifies it independently — no service blindly trusts an upstream service's say-so.

## Environment variables (root `.env`)

| Variable | Used by | Purpose |
|---|---|---|
| `JWT_SECRET` | backend, fastapi | Shared HS256 signing/verification key |
| `DEEPSEEK_KEY` | fastapi | LLM calls (`ChatDeepSeek`) |
| `OPENAI_KEY` | mcp-server | Embeddings (`text-embedding-3-small`) |
| `DATABASE_URL` | backend | Postgres connection |
| `PYTHON_URL` | backend | Node → FastAPI |
| `NODE_URL` | mcp-server | MCP → Node memory API |
| `MCP_URL` | fastapi | FastAPI → MCP server |
| `CORS_ORIGIN` | backend | Allowed browser origin |

## Known limitations

- **`gmail`/`github` nodes are stubs** — they return hardcoded strings, no real integration yet. `route(agent)` works as a graph mechanism, but there's nothing real behind either specialist.
- **`MemorySaver` is in-memory only** — conversation history is lost on any FastAPI restart (including the `--reload` dev server picking up a file save), and won't work correctly if this service ever runs as multiple replicas. Fine for now since threads are meant to be short-lived per session; would need a persistent (e.g. Postgres-backed) checkpointer for anything longer-lived.
- **No message-window trimming yet** — `state.messages` is passed to the LLM without a cap. A naive count-based slice (tried earlier) breaks OpenAI/DeepSeek's requirement that a `ToolMessage` immediately follow its originating `AIMessage`'s `tool_calls` — any trim needs to cut on whole-turn boundaries, not raw message count.
- **No durable "conversation list."** Each browser session gets a disposable thread; there's no feature yet for a user to browse or resume past conversations.
- **Rate limiting only guards `/chat` and `/auth/*` at the Node layer** — FastAPI and the MCP server have no independent limits, relying entirely on Node being the single entry point.
