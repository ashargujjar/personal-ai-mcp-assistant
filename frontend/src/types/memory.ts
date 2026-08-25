import type { ID } from "./common";

export type MemoryCategory = "preference" | "fact" | "skill" | "relationship" | "project";

export interface Memory {
  id: ID;
  content: string;
  category: MemoryCategory;
  source: string;
  createdAt: string;
  lastUsedAt?: string;
}
