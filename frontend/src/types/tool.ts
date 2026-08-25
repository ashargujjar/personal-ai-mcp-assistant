import type { ID } from "./common";

export type ToolCallStatus = "completed" | "error" | "running";

export interface ToolCallLog {
  id: ID;
  toolName: string;
  status: ToolCallStatus;
  timestamp: string;
  durationMs: number;
  input: Record<string, unknown>;
  output: Record<string, unknown> | string;
}
