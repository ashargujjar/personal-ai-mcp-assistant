import type { ToolCallLog } from "@/types";

export const toolLogs: ToolCallLog[] = [
  { id: "log-1", toolName: "Gmail.search_emails", status: "completed", timestamp: "2026-08-22T08:12:00Z", durationMs: 210, input: { query: "important", folder: "inbox" }, output: "3 emails matched" },
  { id: "log-2", toolName: "Calendar.list_events", status: "completed", timestamp: "2026-08-22T08:12:03Z", durationMs: 140, input: { range: "today" }, output: "4 events found" },
  { id: "log-3", toolName: "GitHub.search_pull_requests", status: "completed", timestamp: "2026-08-22T08:12:05Z", durationMs: 320, input: { repo: "auth-service", state: "open" }, output: "1 open PR found" },
  { id: "log-4", toolName: "Memory.retrieve", status: "completed", timestamp: "2026-08-22T08:12:06Z", durationMs: 90, input: { query: "client contact" }, output: "2 memories retrieved" },
  { id: "log-5", toolName: "Knowledge.search", status: "error", timestamp: "2026-08-22T07:58:00Z", durationMs: 1800, input: { query: "checkpointing" }, output: "Vector index timeout" },
  { id: "log-6", toolName: "Tasks.create", status: "completed", timestamp: "2026-08-22T07:45:00Z", durationMs: 60, input: { title: "Review the auth PR before Friday" }, output: { taskId: "task-created-1" } },
  { id: "log-7", toolName: "Meetings.prepare_brief", status: "completed", timestamp: "2026-08-21T19:20:00Z", durationMs: 640, input: { eventId: "event-2" }, output: "Brief generated with 3 suggested questions" },
  { id: "log-8", toolName: "Email.send", status: "completed", timestamp: "2026-08-21T14:10:00Z", durationMs: 280, input: { approvalId: "approval-3" }, output: "Email sent after approval" },
  { id: "log-9", toolName: "Database.query", status: "running", timestamp: "2026-08-22T08:20:00Z", durationMs: 0, input: { sql: "SELECT * FROM tasks WHERE status != 'done'" }, output: "" },
  { id: "log-10", toolName: "Memory.store", status: "completed", timestamp: "2026-08-18T09:12:00Z", durationMs: 50, input: { content: "user prefers concise reviews" }, output: "Stored" },
];
