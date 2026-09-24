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
- Resume screening backed by Gmail PDF discovery, Cloudinary resume storage, PDF text extraction, applicant tracking, and ATS scoring
- Background workers for resume discovery, resume attachment download/storage, resume PDF cleanup, and ATS scans
- PDF-aware assistant retrieval over ingested document chunks
- PostgreSQL and pgvector storage
- Frontend command palette, tool activity, tool permissions, settings, webhooks, meetings, GitHub, resume screening, and voice surfaces

The frontend feature pages are at different maturity levels. Assistant chat, authentication, tasks, knowledge/document workflows, Gmail, Calendar, resume screening, and backend APIs have real service paths. Several other pages still use mock data for their presentation layer.
## Demo
1. docker containers
<img width="1553" height="905" alt="image" src="https://github.com/user-attachments/assets/3bb7639c-7f52-41a2-8c2a-8fa97d9fe397" />
<img width="756" height="801" alt="image" src="https://github.com/user-attachments/assets/24a1e517-46bd-4801-aca2-1bbeacc385fc" /># Nexus AI

2. saving conversation in long term memory
<img width="1181" height="756" alt="image" src="https://github.com/user-attachments/assets/95a89175-f959-4ac1-b1ef-02ad52c63381" />
3. Getting the data ai knows about us
   <img width="1155" height="612" alt="image" src="https://github.com/user-attachments/assets/19ad3833-bf6a-4598-bd78-2ccc06aaae9a" />
4. Sending mail to recipent humman in the loop for approval
   <img width="742" height="483" alt="image" src="https://github.com/user-attachments/assets/e125e085-00ab-4276-9e96-a0c3ef811898" />
   <img width="1810" height="932" alt="image" src="https://github.com/user-attachments/assets/201b83ef-73bd-4f51-a5df-f0ade61336bd" />
5. Rag pdf upload
   <img width="1477" height="565" alt="image" src="https://github.com/user-attachments/assets/655de81c-dcc6-46e7-bb1c-e4f9b76648fc" />
   <img width="1143" height="770" alt="image" src="https://github.com/user-attachments/assets/8e20daf8-1d88-41aa-8be2-8230936d6ec8" />

6. Multi workflow run
   <img width="883" height="470" alt="image" src="https://github.com/user-attachments/assets/7df8664f-ebbd-40c7-9d5f-913ddeae21a1" />
<img width="1125" height="747" alt="image" src="https://github.com/user-attachments/assets/42f72d4d-c787-40cb-b65d-e1acd6e3e0bc" />
<img width="756" height="801" alt="image" src="https://github.com/user-attachments/assets/ef8513f5-dc46-4a5e-9332-71dd1e9f85e8" />
calender event also created
<img width="1876" height="723" alt="image" src="https://github.com/user-attachments/assets/59748e77-5a38-4719-bf1b-8b882c9819e5" />
<img width="1893" height="956" alt="image" src="https://github.com/user-attachments/assets/60f1fca6-7827-4ed9-abe3-4781fbf0c718" />
7. Resume screening
   cv's on the emails
   <img width="1505" height="742" alt="image" src="https://github.com/user-attachments/assets/ecb8c64f-5b8d-4028-8e02-77da93823414" />
   cv's get from email
   <img width="1172" height="680" alt="image" src="https://github.com/user-attachments/assets/6c6fe08b-c64f-4816-a077-ae97d23b396e" />
   ATS scan performed on each cv
   <img width="1547" height="753" alt="image" src="https://github.com/user-attachments/assets/3023aedd-769b-41b1-b68b-2327952ec886" />
   <img width="1162" height="642" alt="image" src="https://github.com/user-attachments/assets/3a0e04c2-60e5-43b1-ab1d-1a571042d1d1" />
   <img width="1161" height="623" alt="image" src="https://github.com/user-attachments/assets/7bdf91f7-d2ca-4831-b94d-48a3f85d2f37" />
   <img width="1162" height="676" alt="image" src="https://github.com/user-attachments/assets/cc1539f0-ff85-4503-9fd5-f833e5091f4c" />
![Uploading image.png…]()












   


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

Resume search --> Gmail PDF discovery --> resume attachment queue --> Cloudinary/PDF text extraction
              --> ATS scan queue --> structured match results
```

## Services

| Directory or service | Stack | Responsibility |
|---|---|---|
| `frontend/` | React, TypeScript, Vite, Tailwind CSS | Authenticated assistant workspace and feature pages |
| `backend/` | Node.js, Express, TypeScript, Prisma | Auth, REST APIs, OAuth integrations, document management, and chat gateway |
| `fastapi/` | FastAPI, LangGraph, LangChain, Python | Conversational agent, graph routing, streaming responses, and ingestion workers |
| `mcp/` | FastMCP, Python | Tool server used by the agent |
| `postgres` | PostgreSQL with `pgvector` | Users, memories, tasks, documents, versions, ingestion jobs, resume searches, applicants, ATS results, and embeddings |
| `redis` | Redis | Celery broker plus BullMQ queues for resume workflows |

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
| `/api/resume-searches` | Authenticated resume search, applicant, PDF text extraction, and ATS scan operations |

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

## Resume Screening and ATS Scan

The resume screening workflow searches a user's Gmail mailbox for PDF resume attachments in a selected date range, saves the resumes, extracts text, and scores candidates against a job description.

Main flow:

1. The user creates a resume search from `/resume-screening` with a job title, job description, and date range.
2. The backend creates a `resume_searches` record and extracts structured job details.
3. `resume-worker` searches Gmail for matching PDF attachments and creates `resume_applicants` records.
4. `resume-attachment-worker` downloads each Gmail attachment, validates that it is a PDF, extracts resume text, stores extraction metadata, and uploads the PDF to Cloudinary.
5. The user starts an ATS scan from the resume search.
6. `resume-ats-scan-worker` compares each extracted resume against the job details and writes `resume_ats_results`.
7. The frontend displays scan progress, candidate details, match scores, matched skills, gaps, strengths, experience, education, and project data.

Resume data is stored in PostgreSQL using these Prisma models:

- `ResumeSearch`
- `ResumeJobDetails`
- `ResumeApplicant`
- `ResumeAtsResult`

The resume workflow uses these backend queues and workers:

- `resume-searches` through `npm run worker:resume`
- `resume-attachments` through `npm run worker:resume-attachment`
- `resume-pdf-deletions` through `npm run worker:resume-pdf-deletion`
- `resume-ats-scans` through `npm run worker:resume-ats-scan`

Relevant API operations:

| Route | Purpose |
|---|---|
| `GET /api/resume-searches` | List the current user's resume searches |
| `POST /api/resume-searches` | Create and queue a new Gmail resume search |
| `GET /api/resume-searches/:id` | Fetch one resume search with applicants and ATS results |
| `PATCH /api/resume-searches/:id` | Update a queued resume search |
| `DELETE /api/resume-searches/:id` | Delete a resume search and queue stored PDF cleanup |
| `POST /api/resume-searches/:id/ats-scan` | Queue ATS scans for saved applicants |
| `POST /api/resume-searches/applicants/:applicantId/pdf-text-extraction` | Store extracted PDF text for an applicant |

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
| `DEEPSEEK_KEY` or `DEEPSEEK_API_KEY` | FastAPI, backend resume workers | Chat, job detail extraction, and ATS resume scoring |
| `DEEPSEEK_MODEL` | Backend resume workers | Optional DeepSeek model override, defaults to `deepseek-chat` |
| `DEEPSEEK_BASE_URL` | Backend resume workers | Optional DeepSeek-compatible API base URL |
| `OPENAI_KEY` | MCP server | Memory embeddings |
| `OPENAI_API_KEY` | FastAPI ingestion and retrieval | Document chunk embeddings |
| `OPENAI_EMBEDDING_MODEL` | FastAPI ingestion and retrieval | Embedding model, defaults to `text-embedding-3-small` |
| `OPENAI_QUERY_MODEL` | FastAPI retrieval | Optional query expansion model |
| `PYTHON_URL` | Backend | Backend-to-FastAPI URL |
| `NODE_URL` | MCP server | MCP-to-backend URL |
| `MCP_URL` | FastAPI | FastAPI-to-MCP URL |
| `CORS_ORIGIN` | Backend | Allowed frontend origin |
| `FRONTEND_URL` | Backend OAuth callbacks | Redirect target after OAuth connection |
| `GOOGLE_CLIENT_ID` | Backend auth, frontend | Google login client ID |
| `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REDIRECT_URI` | Backend | Gmail OAuth and resume search mailbox access |
| `CALENDAR_REDIRECT_URI` | Backend | Google Calendar OAuth callback override |
| `CLOUDINARY_CLOUD_NAME` or `CLOUDINARY_NAME` | Backend, FastAPI ingestion | PDF storage cloud name |
| `CLOUDINARY_API_KEY` or `CLOUDINARY_API` | Backend, FastAPI ingestion | PDF storage API key |
| `CLOUDINARY_API_SECRET` or `CLOUDINARY_SECRET` | Backend, FastAPI ingestion | PDF storage API secret |
| `CELERY_BROKER_URL` | Ingestion services | Redis broker URL |
| `REDIS_URL` | Backend workers | BullMQ resume workflow queue connection |
| `VITE_API_URL` | Frontend | Browser-to-backend API URL |
| `VITE_GOOGLE_CLIENT_ID` | Frontend | Optional Google login client ID |

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

The Compose stack also starts the resume workflow workers:

- `resume-worker`
- `resume-attachment-worker`
- `resume-pdf-deletion-worker`
- `resume-ats-scan-worker`

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
npm run worker:resume
npm run worker:resume-attachment
npm run worker:resume-pdf-deletion
npm run worker:resume-ats-scan
```

The worker commands are separate long-running processes. When using Docker Compose, they are started as separate services automatically.

### FastAPI and MCP

Install the dependencies listed in:

- `fastapi/requirements.txt`
- `mcp/requirements.txt`

The Docker Compose setup is the recommended way to run the Python services together with their dependent services.

FastAPI exposes `GET /` for a basic status response and `POST /chat` for streaming agent interaction. The chat graph includes Gmail, Calendar, Task, memory, and PDF/document retrieval paths.

## Database and Migrations

Prisma schema and migrations are stored in `backend/prisma`.

```bash
cd backend
npx prisma generate
npx prisma migrate dev
```

For an already-running Docker Postgres container, apply pending migrations from the backend directory with:

```bash
cd backend
DATABASE_URL=postgresql://nexus:nexus@localhost:5432/nexus_ai npx prisma migrate deploy
```

The current migration history includes the resume search, Gmail attachment, job details, PDF text extraction, ATS result, and ATS scan status tables/fields through `20260923130000_add_resume_ats_scan_status`.

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
- The voice, meetings, webhooks, tool activity, and tool permissions surfaces are not all backed by complete production workflows yet.
- Resume screening requires Gmail OAuth, Cloudinary PDF storage credentials, Redis, the resume workers, and an AI provider key for ATS scoring.
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
