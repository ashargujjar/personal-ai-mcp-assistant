import type { ID } from "./common";

export type DocumentStatus = "processing" | "ready" | "error";

export interface KnowledgeDocument {
  id: ID;
  filename: string;
  fileUrl?: string;
  sizeKb: number;
  pageCount?: number;
  status: DocumentStatus;
  uploadedAt: string;
  summary?: string;
}
