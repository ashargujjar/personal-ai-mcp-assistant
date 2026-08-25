import { CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { PriorityBadge } from "@/components/shared/PriorityBadge";
import { formatDate } from "@/lib/utils";
import type { Task } from "@/types";

export function PriorityTaskList({ tasks, isLoading }: { tasks?: Task[]; isLoading: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Priority Tasks</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : !tasks || tasks.length === 0 ? (
          <EmptyState icon={CheckCircle2} title="All caught up" description="No pending tasks right now." />
        ) : (
          <ul className="divide-y divide-border">
            {tasks.map((task) => (
              <li key={task.id} className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{task.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {task.project ?? "No project"}
                    {task.deadline && <> · Due {formatDate(task.deadline)}</>}
                  </p>
                </div>
                <PriorityBadge priority={task.priority} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
