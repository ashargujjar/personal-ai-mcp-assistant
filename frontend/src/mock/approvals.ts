import type { PendingApproval } from "@/types";

export const pendingApprovals: PendingApproval[] = [
  {
    id: "approval-1",
    type: "send_email",
    title: "Send email to Maria Alvarez",
    context: "Re: Project Update — need your input by EOD",
    target: "maria@brightclient.com",
    aiDraft:
      "Hi Maria,\n\nConfirming the JWT refresh token rollout is on track for Friday — PR #201 addresses the concurrency fix and is in final review.\n\nOn tool permissions: we'll surface approval prompts per-action rather than batching them, so it's always clear what's being approved.\n\nHappy to do the 15-minute sync tomorrow if that still works.\n\nBest,\nAshar",
    status: "pending",
    requestedAt: "2026-08-22T08:15:00Z",
  },
  {
    id: "approval-2",
    type: "github_issue",
    title: "Open issue in vectorworks-io/mcp-tool-server",
    context: "OAuth callback error on malformed state param",
    target: "vectorworks-io/mcp-tool-server",
    aiDraft:
      "The OAuth callback throws an unhandled exception instead of returning a 400 when the `state` param is malformed. Repro: send a callback request with a truncated state value.",
    status: "pending",
    requestedAt: "2026-08-20T09:30:00Z",
  },
  {
    id: "approval-3",
    type: "github_issue",
    title: "Open issue in vectorworks-io/auth-service",
    context: "Session expiration bug on tab refocus",
    target: "vectorworks-io/auth-service",
    aiDraft:
      "Users are silently logged out when a background tab regains focus after the session token has expired. Expected: a re-auth prompt instead of a silent logout. Repro steps attached from the support thread.",
    status: "approved",
    requestedAt: "2026-08-16T11:00:00Z",
    resolvedAt: "2026-08-16T11:40:00Z",
  },
];
