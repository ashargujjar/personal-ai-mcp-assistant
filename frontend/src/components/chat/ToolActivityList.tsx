import { Check, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ToolExecution } from "@/types";

export function ToolActivityList({ executions }: { executions: ToolExecution[] }) {
  if (executions.length === 0) return null;

  const allDone = executions.every((e) => e.status === "completed" || e.status === "error");

  return (
    <div className="rounded-lg border border-border bg-secondary/40 p-3">
      <p className="mb-2 text-xs font-medium text-muted-foreground">{allDone ? "Tool activity" : "Working..."}</p>
      <ul className="space-y-1.5">
        {executions.map((exec) => (
          <li key={exec.id} className="flex items-center gap-2 text-sm">
            <span
              className={cn(
                "flex h-4 w-4 shrink-0 items-center justify-center rounded-full",
                exec.status === "completed" && "bg-success/15 text-success",
                exec.status === "error" && "bg-destructive/15 text-destructive",
                (exec.status === "pending" || exec.status === "running") && "bg-secondary text-muted-foreground"
              )}
            >
              {exec.status === "completed" && <Check className="h-3 w-3" />}
              {exec.status === "error" && <X className="h-3 w-3" />}
              {exec.status === "running" && <Loader2 className="h-3 w-3 animate-spin" />}
              {exec.status === "pending" && <span className="h-1 w-1 rounded-full bg-current" />}
            </span>
            <span
              className={cn(
                exec.status === "pending" ? "text-muted-foreground" : "text-foreground/85",
                "flex-1"
              )}
            >
              {exec.label}
            </span>
            {exec.status === "completed" && exec.durationMs !== undefined && (
              <span className="text-xs text-muted-foreground">{exec.durationMs}ms</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
