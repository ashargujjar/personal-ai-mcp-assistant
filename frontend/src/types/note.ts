import type { ID } from "./common";

export interface Note {
  id: ID;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}
