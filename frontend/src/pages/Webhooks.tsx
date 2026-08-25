import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Webhook } from "lucide-react";
import { AutomationCard } from "@/components/automations/AutomationCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { webhookService } from "@/services/webhookService";

export default function Webhooks() {
  const queryClient = useQueryClient();
  const automationsQuery = useQuery({ queryKey: ["automations", "list"], queryFn: webhookService.list });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => webhookService.toggle(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["automations", "list"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => webhookService.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["automations", "list"] }),
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      <PageHeader title="Webhooks" subtitle="Event-driven automations that run across your connected tools." />

      {automationsQuery.isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : !automationsQuery.data || automationsQuery.data.length === 0 ? (
        <EmptyState icon={Webhook} title="No automations yet" description="Automations you create will appear here." />
      ) : (
        <div className="space-y-3">
          {automationsQuery.data.map((automation) => (
            <AutomationCard
              key={automation.id}
              automation={automation}
              onToggle={(id) => toggleMutation.mutate(id)}
              onDelete={(id) => deleteMutation.mutate(id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
