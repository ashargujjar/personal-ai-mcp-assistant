import type { DatabaseConnection, DatabaseTable } from "@/types";

export const databaseConnections: DatabaseConnection[] = [
  { id: "db-1", name: "nexus-primary", engine: "mongodb", status: "connected", tableCount: 6, sizeMb: 148, lastSyncedAt: "2026-08-22T08:00:00Z" },
  { id: "db-2", name: "analytics-warehouse", engine: "postgres", status: "connected", tableCount: 14, sizeMb: 2340, lastSyncedAt: "2026-08-22T06:00:00Z" },
  { id: "db-3", name: "local-dev", engine: "sqlite", status: "disconnected", tableCount: 6, sizeMb: 9, lastSyncedAt: "2026-08-19T10:00:00Z" },
];

export const databaseTables: DatabaseTable[] = [
  { id: "tbl-1", connectionId: "db-1", name: "users", rowCount: 1, columns: [{ name: "_id", type: "ObjectId" }, { name: "name", type: "string" }, { name: "email", type: "string" }] },
  { id: "tbl-2", connectionId: "db-1", name: "tasks", rowCount: 12, columns: [{ name: "_id", type: "ObjectId" }, { name: "title", type: "string" }, { name: "status", type: "string" }, { name: "deadline", type: "date" }] },
  { id: "tbl-3", connectionId: "db-1", name: "memories", rowCount: 8, columns: [{ name: "_id", type: "ObjectId" }, { name: "content", type: "string" }, { name: "category", type: "string" }] },
  { id: "tbl-4", connectionId: "db-2", name: "tool_call_events", rowCount: 48213, columns: [{ name: "id", type: "bigint" }, { name: "tool_name", type: "text" }, { name: "duration_ms", type: "int" }, { name: "created_at", type: "timestamp" }] },
  { id: "tbl-5", connectionId: "db-2", name: "email_summaries", rowCount: 2109, columns: [{ name: "id", type: "bigint" }, { name: "subject", type: "text" }, { name: "sentiment", type: "text" }] },
];
