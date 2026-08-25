import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";
import { ApprovalCard } from "@/components/approvals/ApprovalCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { approvalService } from "@/services/approvalService";

export default function Approvals() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const approvalsQuery = useQuery({ queryKey: ["approvals", "list"], queryFn: approvalService.list });

  const approveMutation = useMutation({
    mutationFn: (id: string) => approvalService.approve(id),
    onSuccess: (approval) => {
      queryClient.invalidateQueries({ queryKey: ["approvals", "list"] });
      toast({ title: "Action approved", description: approval ? `NEXUS will carry out: ${approval.title}` : undefined });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => approvalService.reject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approvals", "list"] });
      toast({ title: "Action rejected" });
    },
  });

  const draftMutation = useMutation({
    mutationFn: ({ id, draft }: { id: string; draft: string }) => approvalService.updateDraft(id, draft),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["approvals", "list"] }),
  });

  const approvals = approvalsQuery.data ?? [];
  const pending = approvals.filter((a) => a.status === "pending");
  const resolved = approvals.filter((a) => a.status !== "pending");

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <PageHeader title="Approval Center" subtitle="Review and approve actions NEXUS wants to take on your behalf." />

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
          <TabsTrigger value="resolved">Resolved ({resolved.length})</TabsTrigger>
        </TabsList>

        {approvalsQuery.isLoading ? (
          <div className="mt-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-40 w-full" />
            ))}
          </div>
        ) : (
          <>
            <TabsContent value="pending" className="mt-4 space-y-3">
              {pending.length === 0 ? (
                <EmptyState icon={ShieldCheck} title="Nothing pending" description="You're all caught up — new actions will appear here." />
              ) : (
                pending.map((approval) => (
                  <ApprovalCard
                    key={approval.id}
                    approval={approval}
                    onApprove={(id) => approveMutation.mutate(id)}
                    onReject={(id) => rejectMutation.mutate(id)}
                    onSaveDraft={(id, draft) => draftMutation.mutate({ id, draft })}
                  />
                ))
              )}
            </TabsContent>
            <TabsContent value="resolved" className="mt-4 space-y-3">
              {resolved.length === 0 ? (
                <EmptyState icon={ShieldCheck} title="No resolved actions yet" />
              ) : (
                resolved.map((approval) => (
                  <ApprovalCard
                    key={approval.id}
                    approval={approval}
                    onApprove={(id) => approveMutation.mutate(id)}
                    onReject={(id) => rejectMutation.mutate(id)}
                    onSaveDraft={(id, draft) => draftMutation.mutate({ id, draft })}
                  />
                ))
              )}
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}
