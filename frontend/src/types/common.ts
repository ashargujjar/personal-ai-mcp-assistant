export type ID = string;

export type Priority = "low" | "medium" | "high" | "urgent";

export type ConnectionStatus = "connected" | "disconnected" | "error" | "connecting";

export interface User {
  id: ID;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export type Source = "email" | "meeting" | "github" | "manual" | "ai" | "calendar" | "document" | "conversation";

export interface SearchResultItem {
  id: ID;
  type: "email" | "github" | "document" | "memory" | "note" | "task" | "meeting" | "calendar";
  title: string;
  subtitle: string;
  path: string;
}
