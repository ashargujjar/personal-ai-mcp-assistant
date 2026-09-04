import type { ID } from "./common";

export type MessageRole = "user" | "assistant";

export type ToolStatus = "pending" | "running" | "completed" | "error";

export interface ToolExecution {
  id: ID;
  label: string;
  toolName: string;
  status: ToolStatus;
  durationMs?: number;
}

export interface SourceCitation {
  id: ID;
  title: string;
  subtitle?: string;
  type: "github" | "document" | "email" | "memory" | "calendar" | "web";
  url?: string;
}

export type ConfirmationAction = "send_email" | "delete_email" | "create_event" | "delete_event";

export interface PendingConfirmation {
  action: ConfirmationAction;
  args: Record<string, unknown>;
  resolved?: "accept" | "reject" | "edit";
}

export type ConfirmationDecision =
  | { type: "accept" }
  | { type: "reject" }
  | { type: "edit"; message: string };

export interface ChatMessage {
  id: ID;
  role: MessageRole;
  content: string;
  createdAt: string;
  toolExecutions?: ToolExecution[];
  sources?: SourceCitation[];
  isStreaming?: boolean;
  feedback?: "up" | "down" | null;
  pendingConfirmation?: PendingConfirmation;
}

export interface Conversation {
  id: ID;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

export interface QuickAction {
  id: ID;
  label: string;
  prompt: string;
  icon: string;
}
