import type { ID } from "./common";

export type DocumentStatus = "processing" | "ready" | "error";

export interface KnowledgeDocument {
  id: ID;
  filename: string;
  sizeKb: number;
  pageCount?: number;
  status: DocumentStatus;
  uploadedAt: string;
  summary?: string;
}

export interface KnowledgeCitation {
  id: ID;
  documentId: ID;
  filename: string;
  page?: number;
}

export interface KnowledgeAnswer {
  answer: string;
  citations: KnowledgeCitation[];
}
