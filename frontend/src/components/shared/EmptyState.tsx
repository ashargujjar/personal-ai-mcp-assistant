import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border px-6 py-14 text-center", className)}>
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-medium">{title}</p>
        {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}
