import { useQuery } from "@tanstack/react-query";
import { approvalService } from "@/services/approvalService";
import { dashboardService } from "@/services/dashboardService";

export function useSidebarBadges() {
  const { data: stats } = useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: dashboardService.getStats,
    staleTime: 60_000,
  });

  const { data: approvals } = useQuery({
    queryKey: ["approvals", "list"],
    queryFn: approvalService.list,
    staleTime: 30_000,
  });

  return {
    unreadEmails: stats?.unreadEmails ?? 0,
    openPRs: stats?.openPRs ?? 0,
    pendingTasks: stats?.pendingTasks ?? 0,
    pendingApprovals: approvals?.filter((a) => a.status === "pending").length ?? 0,
  };
}
