import type { KnowledgeDocument } from "@/types";

export const documents: KnowledgeDocument[] = [
  { id: "doc-1", filename: "Nexus AI - Architecture Overview.pdf", sizeKb: 2140, pageCount: 18, status: "ready", uploadedAt: "2026-08-20T12:04:00Z", summary: "System design for the multi-tool assistant: LangGraph orchestration, tool nodes, memory store." },
  { id: "doc-2", filename: "Bright Client - Project Requirements.docx", sizeKb: 340, pageCount: 6, status: "ready", uploadedAt: "2026-08-15T09:30:00Z", summary: "Scope and timeline for the auth flow rollout with Bright Client." },
  { id: "doc-3", filename: "LangGraph Documentation.pdf", sizeKb: 5210, pageCount: 64, status: "ready", uploadedAt: "2026-08-10T10:00:00Z", summary: "Reference docs covering graph state, checkpointing, and human-in-the-loop nodes." },
  { id: "doc-4", filename: "Vector Databases Comparison 2026.pdf", sizeKb: 1870, pageCount: 22, status: "ready", uploadedAt: "2026-08-08T15:45:00Z", summary: "Benchmark comparison of pgvector, Qdrant, and Pinecone for the RAG pipeline." },
  { id: "doc-5", filename: "Distributed Systems - Lecture 8 Slides.pdf", sizeKb: 980, pageCount: 40, status: "processing", uploadedAt: "2026-08-22T06:30:00Z" },
  { id: "doc-6", filename: "Q3 Roadmap Draft.pdf", sizeKb: 410, status: "error", uploadedAt: "2026-08-21T18:10:00Z" },
];
