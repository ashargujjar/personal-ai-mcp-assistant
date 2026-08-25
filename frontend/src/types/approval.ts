import type { ID } from "./common";

export type ApprovalType = "send_email" | "github_issue";
export type ApprovalStatus = "pending" | "approved" | "rejected";

export interface PendingApproval {
  id: ID;
  type: ApprovalType;
  title: string;
  context: string;
  target: string;
  aiDraft: string;
  status: ApprovalStatus;
  requestedAt: string;
  resolvedAt?: string;
}
