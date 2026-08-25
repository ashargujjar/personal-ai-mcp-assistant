import { pendingApprovals } from "@/mock/approvals";
import { sleep } from "@/lib/utils";
import type { PendingApproval } from "@/types";

let approvals: PendingApproval[] = [...pendingApprovals];

export const approvalService = {
  async list(): Promise<PendingApproval[]> {
    await sleep(200);
    return [...approvals].sort((a, b) => (a.requestedAt < b.requestedAt ? 1 : -1));
  },

  async approve(id: string): Promise<PendingApproval | undefined> {
    await sleep(500);
    approvals = approvals.map((a) => (a.id === id ? { ...a, status: "approved", resolvedAt: new Date().toISOString() } : a));
    return approvals.find((a) => a.id === id);
  },

  async reject(id: string): Promise<PendingApproval | undefined> {
    await sleep(400);
    approvals = approvals.map((a) => (a.id === id ? { ...a, status: "rejected", resolvedAt: new Date().toISOString() } : a));
    return approvals.find((a) => a.id === id);
  },

  async updateDraft(id: string, draft: string): Promise<PendingApproval | undefined> {
    await sleep(200);
    approvals = approvals.map((a) => (a.id === id ? { ...a, aiDraft: draft } : a));
    return approvals.find((a) => a.id === id);
  },

  async request(input: Omit<PendingApproval, "id" | "status" | "requestedAt" | "resolvedAt">): Promise<PendingApproval> {
    await sleep(250);
    const approval: PendingApproval = {
      ...input,
      id: `approval-${Date.now()}`,
      status: "pending",
      requestedAt: new Date().toISOString(),
    };
    approvals = [approval, ...approvals];
    return approval;
  },
};
