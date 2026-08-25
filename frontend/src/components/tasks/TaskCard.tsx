import { Github, Mail, Sparkles, User, Users, type LucideIcon } from "lucide-react";
import { PriorityBadge } from "@/components/shared/PriorityBadge";
import { Card } from "@/components/ui/card";
import { cn, formatDate } from "@/lib/utils";
import type { Task } from "@/types";

const sourceIcons: Record<Task["source"], LucideIcon> = {
  email: Mail,
  meeting: Users,
  github: Github,
  manual: User,
  ai: Sparkles,
  calendar: Users,
  document: Mail,
  conversation: Sparkles,
};

export function TaskCard({ task, draggable, onDragStart }: { task: Task; draggable?: boolean; onDragStart?: (e: React.DragEvent) => void }) {
  const SourceIcon = sourceIcons[task.source];
  const isOverdue = task.deadline && new Date(task.deadline) < new Date("2026-08-22T00:00:00") && task.status !== "done";

  return (
    <Card
      draggable={draggable}
      onDragStart={onDragStart}
      className={cn("p-3.5", draggable && "cursor-grab active:cursor-grabbing")}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-snug">{task.title}</p>
        <PriorityBadge priority={task.priority} />
      </div>
      {task.description && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{task.description}</p>}
      <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <SourceIcon className="h-3 w-3" />
          {task.source}
        </span>
        {task.project && (
          <>
            <span>·</span>
            <span>{task.project}</span>
          </>
        )}
        {task.deadline && (
          <>
            <span>·</span>
            <span className={cn(isOverdue && "font-medium text-destructive")}>Due {formatDate(task.deadline)}</span>
          </>
        )}
      </div>
    </Card>
  );
}
