import { recentActivity, type ActivityItem } from "@/mock/activity";
import { emails } from "@/mock/email";
import { pullRequests } from "@/mock/github";
import { calendarEvents } from "@/mock/calendar";
import { tasks } from "@/mock/tasks";
import { sleep } from "@/lib/utils";
import type { CalendarEvent, Task } from "@/types";

export interface DashboardStats {
  unreadEmails: number;
  openPRs: number;
  meetingsToday: number;
  pendingTasks: number;
}

export interface DashboardBriefing {
  summaryLines: string[];
  recommendedFocus: string[];
}

const TODAY = "2026-08-22";

export const dashboardService = {
  async getStats(): Promise<DashboardStats> {
    await sleep(200);
    return {
      unreadEmails: emails.filter((e) => e.folder === "inbox" && !e.isRead).length + 9,
      openPRs: pullRequests.filter((p) => p.state === "open").length,
      meetingsToday: calendarEvents.filter((e) => e.start.startsWith(TODAY)).length,
      pendingTasks: tasks.filter((t) => t.status !== "done").length,
    };
  },

  async getBriefing(): Promise<DashboardBriefing> {
    await sleep(300);
    return {
      summaryLines: [
        "You have 4 meetings today.",
        "3 important emails require attention.",
        "2 GitHub PRs are waiting for review.",
        "You have 3 tasks approaching their deadlines.",
      ],
      recommendedFocus: ["Review authentication PR", "Reply to client email", "Finish MCP integration"],
    };
  },

  async getTodaySchedule(): Promise<CalendarEvent[]> {
    await sleep(200);
    return calendarEvents.filter((e) => e.start.startsWith(TODAY)).sort((a, b) => (a.start > b.start ? 1 : -1));
  },

  async getPriorityTasks(): Promise<Task[]> {
    await sleep(200);
    return tasks
      .filter((t) => t.status !== "done")
      .sort((a, b) => {
        const order = { urgent: 0, high: 1, medium: 2, low: 3 };
        return order[a.priority] - order[b.priority];
      })
      .slice(0, 5);
  },

  async getRecentActivity(): Promise<ActivityItem[]> {
    await sleep(200);
    return [...recentActivity].sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
  },
};
