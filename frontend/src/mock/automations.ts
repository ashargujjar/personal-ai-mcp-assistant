import type { Automation } from "@/types";

export const automations: Automation[] = [
  { id: "auto-1", name: "Daily briefing email", description: "Sends a morning summary of tasks, meetings, and unread email.", trigger: "Every day at 7:00 AM", action: "Send email via Gmail", isActive: true, runCount: 42, lastRunAt: "2026-08-22T07:00:00Z" },
  { id: "auto-2", name: "PR review reminder", description: "Pings when a PR has been open for review more than 24 hours.", trigger: "GitHub PR open > 24h", action: "Send Slack-style notification", isActive: true, runCount: 18, lastRunAt: "2026-08-21T09:00:00Z" },
  { id: "auto-3", name: "Meeting brief auto-generation", description: "Generates a prep brief 15 minutes before external meetings.", trigger: "15 min before calendar event with external attendee", action: "Run Meeting.prepare_brief", isActive: true, runCount: 9, lastRunAt: "2026-08-22T11:15:00Z" },
  { id: "auto-4", name: "Weekly knowledge digest", description: "Summarizes newly ingested documents into a weekly digest note.", trigger: "Every Monday at 8:00 AM", action: "Create note via Notes.create", isActive: false, runCount: 3, lastRunAt: "2026-08-11T08:00:00Z" },
];
