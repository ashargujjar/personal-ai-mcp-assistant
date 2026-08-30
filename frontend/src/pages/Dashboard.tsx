import { useQuery } from "@tanstack/react-query";
import { CheckSquare, GitPullRequest, Mail, Users } from "lucide-react";
import { BriefingCard } from "@/components/dashboard/BriefingCard";
import { PriorityTaskList } from "@/components/dashboard/PriorityTaskList";
import { RecentActivityFeed } from "@/components/dashboard/RecentActivityFeed";
import { ScheduleTimeline } from "@/components/dashboard/ScheduleTimeline";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { useAuth } from "@/hooks/useAuth";
import { dashboardService } from "@/services/dashboardService";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function Dashboard() {
  const { user } = useAuth();
  const stats = useQuery({ queryKey: ["dashboard", "stats"], queryFn: dashboardService.getStats });
  const briefing = useQuery({ queryKey: ["dashboard", "briefing"], queryFn: dashboardService.getBriefing });
  const schedule = useQuery({ queryKey: ["dashboard", "schedule"], queryFn: dashboardService.getTodaySchedule });
  const priorityTasks = useQuery({ queryKey: ["dashboard", "priority-tasks"], queryFn: dashboardService.getPriorityTasks });
  const activity = useQuery({ queryKey: ["dashboard", "activity"], queryFn: dashboardService.getRecentActivity });

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
      <PageHeader title={`${greeting()}, ${user?.name ?? "there"}`} subtitle="Here's what's happening across your digital workspace." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Unread Emails" value={stats.data?.unreadEmails ?? "—"} icon={Mail} accent="default" />
        <StatCard label="Open PRs" value={stats.data?.openPRs ?? "—"} icon={GitPullRequest} accent="warning" />
        <StatCard label="Meetings Today" value={stats.data?.meetingsToday ?? "—"} icon={Users} accent="success" />
        <StatCard label="Pending Tasks" value={stats.data?.pendingTasks ?? "—"} icon={CheckSquare} accent="destructive" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <BriefingCard briefing={briefing.data} isLoading={briefing.isLoading} />
        </div>
        <PriorityTaskList tasks={priorityTasks.data} isLoading={priorityTasks.isLoading} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ScheduleTimeline events={schedule.data} isLoading={schedule.isLoading} />
        <RecentActivityFeed items={activity.data} isLoading={activity.isLoading} />
      </div>
    </div>
  );
}
