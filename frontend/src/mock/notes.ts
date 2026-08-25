import type { Note } from "@/types";

export const notes: Note[] = [
  {
    id: "note-1",
    title: "LangGraph checkpointing notes",
    content: "Checkpointing persists full graph state after each super-step, keyed by thread_id. Enables resuming interrupted runs, human-in-the-loop approval gates, and time-travel debugging. Default checkpointer is in-memory — use Postgres/SQLite saver for production.",
    tags: ["langgraph", "architecture"],
    createdAt: "2026-08-10T10:00:00Z",
    updatedAt: "2026-08-18T09:00:00Z",
  },
  {
    id: "note-2",
    title: "Auth rollout — open questions",
    content: "Should MCP tool approval prompts be shown per-action or batched? Need to confirm Friday deadline still works given the concurrency fix in review.",
    tags: ["auth-service", "bright-client"],
    createdAt: "2026-08-15T11:00:00Z",
    updatedAt: "2026-08-21T14:00:00Z",
  },
  {
    id: "note-3",
    title: "Distributed systems — failure recovery",
    content: "Thesis outline draft: framing failure recovery as a checkpoint/replay problem, drawing parallels to LangGraph's own checkpointing model.",
    tags: ["university", "thesis"],
    createdAt: "2026-08-05T09:00:00Z",
    updatedAt: "2026-08-20T08:00:00Z",
  },
  {
    id: "note-4",
    title: "Q3 roadmap themes",
    content: "Three themes locked in: agent reliability, MCP tool marketplace, cost optimization. Need cost-per-session benchmark before the planning call.",
    tags: ["roadmap", "planning"],
    createdAt: "2026-08-19T16:00:00Z",
    updatedAt: "2026-08-19T16:00:00Z",
  },
  {
    id: "note-5",
    title: "Vector DB shortlist",
    content: "pgvector for simplicity and existing Postgres infra. Qdrant if we need dedicated scaling. Pinecone ruled out — cost at our volume.",
    tags: ["rag", "architecture"],
    createdAt: "2026-08-08T15:00:00Z",
    updatedAt: "2026-08-08T15:00:00Z",
  },
];
