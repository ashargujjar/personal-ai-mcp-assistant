export type ActivityType = "github" | "email" | "document" | "task" | "memory" | "meeting";

export interface ActivityItem {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  timestamp: string;
}

export const recentActivity: ActivityItem[] = [
  { id: "act-1", type: "github", title: "PR opened", description: "Fix JWT refresh token race condition — auth-service #201", timestamp: "2026-08-22T08:05:00Z" },
  { id: "act-2", type: "email", title: "New important email", description: "Maria Alvarez — Project Update, need your input by EOD", timestamp: "2026-08-22T07:42:00Z" },
  { id: "act-3", type: "document", title: "Document processed", description: "Nexus AI - Architecture Overview.pdf finished indexing", timestamp: "2026-08-20T12:04:00Z" },
  { id: "act-4", type: "task", title: "Task completed", description: "Fix embeddings service connection pool exhaustion", timestamp: "2026-08-21T14:20:00Z" },
  { id: "act-5", type: "memory", title: "Memory updated", description: "Learned: user is currently learning MCP and LangGraph", timestamp: "2026-08-18T09:12:00Z" },
  { id: "act-6", type: "meeting", title: "Meeting transcribed", description: "Team Standup — 3 action items extracted", timestamp: "2026-08-21T09:16:00Z" },
  { id: "act-7", type: "github", title: "Issue opened", description: "OAuth callback error on malformed state param — mcp-tool-server #156", timestamp: "2026-08-22T06:15:00Z" },
  { id: "act-8", type: "email", title: "Email archived", description: "Notion weekly workspace digest", timestamp: "2026-08-18T09:05:00Z" },
];
