import { CheckSquare, FileText, Github, Mail, Sparkles, Users, type LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRelativeTime } from "@/lib/utils";
import type { ActivityItem, ActivityType } from "@/mock/activity";

const icons: Record<ActivityType, LucideIcon> = {
  github: Github,
  email: Mail,
  document: FileText,
  task: CheckSquare,
  memory: Sparkles,
  meeting: Users,
};

export function RecentActivityFeed({ items, isLoading }: { items?: ActivityItem[]; isLoading: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          <ul className="space-y-3.5">
            {items?.map((item) => {
              const Icon = icons[item.type];
              return (
                <li key={item.id} className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-secondary">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{item.description}</p>
                  </div>
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">{formatRelativeTime(item.timestamp)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
