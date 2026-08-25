import type { ID } from "./common";

export type DatabaseEngine = "postgres" | "mongodb" | "mysql" | "sqlite";

export interface DatabaseConnection {
  id: ID;
  name: string;
  engine: DatabaseEngine;
  status: "connected" | "disconnected" | "error";
  tableCount: number;
  sizeMb: number;
  lastSyncedAt: string;
}

export interface DatabaseColumn {
  name: string;
  type: string;
}

export interface DatabaseTable {
  id: ID;
  connectionId: ID;
  name: string;
  rowCount: number;
  columns: DatabaseColumn[];
}
