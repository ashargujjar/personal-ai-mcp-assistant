import type { ID } from "./common";

export interface Memory {
  id: ID;
  type: string;
  key: string | null;
  content: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface MemoryPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface MemoryListResult {
  data: Memory[];
  pagination: MemoryPagination;
}
