# Nexus AI

Nexus AI is a personal AI operating system built around a chat-first assistant. It combines a React workspace, an authenticated Node.js API, a FastAPI/LangGraph agent, MCP tools, PostgreSQL with pgvector, and asynchronous document ingestion.

## Current Status

The project currently includes:

- A React frontend with authentication screens and a multi-page assistant workspace
- A streaming assistant chat experience
- LangGraph-based tool routing and conversational state
- Long-term memory with semantic vector search
- MCP tools for memory, Gmail, Google Calendar, and assistant actions
- JWT authentication shared between the Node and Python services
- Gmail OAuth connection, message listing, message retrieval, sending, and trash operations
- Google Calendar OAuth connection, event listing, event retrieval, creation, and deletion
- Persistent task CRUD operations
- PDF document upload, versioning, metadata, download, deletion, and ingestion-job tracking
- Redis and Celery workers for asynchronous document ingestion
- PostgreSQL and pgvector storage
- Frontend command palette, tool activity, tool permissions, settings, webhooks, meetings, GitHub, resume screening, and voice surfaces

The frontend feature pages are at different maturity levels. Assistant chat, authentication, tasks, knowledge/document workflows, Gmail, Calendar, and backend APIs have real service paths. Several other pages still use mock data for their presentation layer.

## Architecture

```text
Browser
  |
  v
React + Vite frontend
  |
  |  JWT-authenticated REST/SSE requests
  v
Express + Prisma backend
  |            |             |
  |            |             +--> Gmail and Google Calendar APIs
  |            |
  |            +--> PostgreSQL + pgvector
  |
  +--> FastAPI + LangGraph agent
          |
          +--> MCP server
                    |
                    +--> memory, Gmail, Calendar, and assistant tools

PDF upload --> document/version records --> ingestion outbox --> Redis/Celery workers
```

## Services

| Directory or service | Stack | Responsibility |
|---|---|---|
| `frontend/` | React, TypeScript, Vite, Tailwind CSS | Authenticated assistant workspace and feature pages |
| `backend/` | Node.js, Express, TypeScript, Prisma | Auth, REST APIs, OAuth integrations, document management, and chat gateway |
| `fastapi/` | FastAPI, LangGraph, LangChain, Python | Conversational agent, graph routing, streaming responses, and ingestion workers |
| `mcp/` | FastMCP, Python | Tool server used by the agent |
| `postgres` | PostgreSQL with `pgvector` | Users, memories, tasks, documents, versions, ingestion jobs, and embeddings |
| `redis` | Redis | Celery broker and ingestion queue |

## Frontend Routes

The frontend currently exposes these routes:

- `/` and `/assistant` - assistant chat
- `/login`, `/signup`, `/logout` - authentication
- `/knowledge` - knowledge base and document workflow
- `/tasks` - task management
- `/calendar` - calendar workspace
- `/meetings` - meeting workspace
- `/github` - GitHub workspace
- `/resume-screening` - resume screening workspace
- `/voice` - voice workspace
- `/webhooks` - automation/webhook workspace
- `/tool-activity` - tool execution history
- `/tool-permissions` - tool permission controls
- `/settings` - user settings

The Notes module has been removed from the application, including its route, navigation entry, search integration, types, services, and mock data.

## Backend API

The Express API is mounted under `/api`.

| Route | Purpose |
|---|---|
| `GET /api/health` | Health check |
| `/api/auth` | Signup, login, and Google login |
| `/api/chat` | Authenticated streaming assistant gateway |
| `/api/memory` | Authenticated memory CRUD and semantic search |
| `/api/gmail` | Gmail connection and message operations |
| `/api/calendar` | Google Calendar connection and event operations |
| `/api/tasks` | Authenticated task CRUD |
| `/api/documents` | Authenticated PDF upload, listing, download, and deletion |

All user-owned resources are scoped using the authenticated user identity. Request payloads are validated with Zod, and protected routes require a JWT.

## Chat and Memory Flow

1. The frontend creates a temporary `threadId` for the browser session.
2. The frontend sends the user's message to `POST /api/chat`.
3. The backend validates the JWT and forwards the request to FastAPI.
4. FastAPI verifies the JWT, builds the LangGraph graph, and streams events back as Server-Sent Events.
5. LangGraph routes the request through the supervisor and available tools.
6. MCP receives tool calls with the caller's authorization token.
7. Memory tools create embeddings and call the backend memory API.
8. PostgreSQL stores memories and performs vector similarity search with pgvector.

Conversation state currently uses an in-memory LangGraph checkpointer keyed by `threadId`. Long-term user memories are stored in PostgreSQL.

More detail is available in [docs/chat-module.md](docs/chat-module.md).

## Document Ingestion

The document pipeline supports PDF uploads and versioned document records:

1. The backend validates and uploads the PDF.
2. A document version and ingestion job are created transactionally.
3. An outbox event is dispatched to the ingestion queue.
4. Redis brokers the job to a Celery worker.
5. The worker extracts metadata, parses and chunks the document, generates embeddings, and stores the resulting data.

Related documentation:

- [Document uploads](docs/document-uploads.md)
- [Document metadata](docs/document-metadata.md)
- [Ingestion jobs](docs/ingestion-jobs.md)
- [Ingestion contract](docs/ingestion-contract.md)

## Running Locally

### Requirements

- Docker Desktop with Docker Compose
- Valid provider credentials for the services you intend to use

### Environment

Create a root `.env` file. The main variables used by the current stack are:

| Variable | Used by | Purpose |
|---|---|---|
| `JWT_SECRET` | Backend, FastAPI | Shared JWT signing and verification secret |
| `DATABASE_URL` | Backend, FastAPI | PostgreSQL connection string |
| `DEEPSEEK_KEY` | FastAPI | Chat model access |
| `OPENAI_KEY` | MCP server, ingestion | Embeddings and related AI operations |
| `PYTHON_URL` | Backend | Backend-to-FastAPI URL |
| `NODE_URL` | MCP server | MCP-to-backend URL |
| `MCP_URL` | FastAPI | FastAPI-to-MCP URL |
| `CORS_ORIGIN` | Backend | Allowed frontend origin |
| Google OAuth variables | Backend | Gmail and Calendar OAuth configuration |
| Cloudinary variables | Backend | PDF storage configuration |
| `CELERY_BROKER_URL` | Ingestion services | Redis broker URL |

The exact provider-specific variable names can be found in the service environment examples and source configuration.

### Start the full stack

```bash
docker compose up --build
```

The services are available at:

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:4000/api |
| FastAPI agent | http://localhost:8000 |
| MCP server | http://localhost:8001 |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |

To stop the stack:

```bash
docker compose down
```

Add `-v` only when you intentionally want to remove the local PostgreSQL and Redis volumes.

## Local Development Commands

### Frontend

```bash
cd frontend
npm install
npm run dev
npm run typecheck
npm run build
```

### Backend

```bash
cd backend
npm install
npm run dev
npm run typecheck
npm run build
```

### FastAPI and MCP

Install the dependencies listed in:

- `fastapi/requirements.txt`
- `mcp/requirements.txt`

The Docker Compose setup is the recommended way to run the Python services together with their dependent services.

## Database and Migrations

Prisma schema and migrations are stored in `backend/prisma`.

```bash
cd backend
npx prisma generate
npx prisma migrate dev
```

The Docker backend uses the PostgreSQL service from `docker-compose.yml`. Do not run destructive database commands against a shared or production database.

## Tests

The repository currently contains focused tests for document metadata and backend document-version behavior:

```bash
cd fastapi
python -m unittest discover -s tests
```

```bash
cd backend
node tests/document-version-migration.cjs
```

## Known Limitations

- Gmail and Google Calendar require valid OAuth credentials and configured redirect URLs.
- Some frontend pages are still presentation-first and use mock data or local mock services.
- GitHub integration is represented in the frontend but does not currently have a corresponding backend route.
- The voice, meetings, resume screening, webhooks, tool activity, and tool permissions surfaces are not all backed by complete production workflows yet.
- LangGraph conversation checkpoints are in memory and are lost when FastAPI restarts.
- There is no durable conversation list for browsing and resuming old chat threads.
- Chat requests are rate-limited at the Node layer; FastAPI and MCP do not currently apply independent rate limits.
- PDF OCR is not implemented for scanned PDFs without extractable text.
- The frontend and service-level test coverage is still limited.

## Project Documentation

- [Chat module](docs/chat-module.md)
- [Document uploads](docs/document-uploads.md)
- [Document metadata](docs/document-metadata.md)
- [Ingestion jobs](docs/ingestion-jobs.md)
- [Ingestion contract](docs/ingestion-contract.md)
