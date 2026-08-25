import { useQuery } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import * as React from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatTime } from "@/lib/utils";
import { toolActivityService } from "@/services/toolActivityService";
import type { ToolCallLog } from "@/types";

const statusConfig = {
  completed: { icon: CheckCircle2, className: "text-success" },
  error: { icon: AlertCircle, className: "text-destructive" },
  running: { icon: Loader2, className: "text-warning animate-spin" },
};

export default function ToolActivity() {
  const [selected, setSelected] = React.useState<ToolCallLog | null>(null);
  const logsQuery = useQuery({ queryKey: ["tool-activity", "list"], queryFn: toolActivityService.list });

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      <PageHeader title="Tool Activity" subtitle="Every tool call your assistant has made across multi-step LangGraph workflows." />

      {logsQuery.isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          {logsQuery.data?.map((log, i) => {
            const status = statusConfig[log.status];
            const StatusIcon = status.icon;
            return (
              <button
                key={log.id}
                onClick={() => setSelected(log)}
                className={cn(
                  "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/40",
                  i !== logsQuery.data!.length - 1 && "border-b border-border"
                )}
              >
                <StatusIcon className={cn("h-4 w-4 shrink-0", status.className)} />
                <span className="min-w-0 flex-1 truncate font-mono text-sm">{log.toolName}</span>
                <Badge variant={log.status === "completed" ? "success" : log.status === "error" ? "destructive" : "warning"}>{log.status}</Badge>
                <span className="w-16 shrink-0 text-right text-xs text-muted-foreground">{log.durationMs}ms</span>
                <span className="w-16 shrink-0 text-right text-xs text-muted-foreground">{formatTime(log.timestamp)}</span>
              </button>
            );
          })}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-mono">{selected?.toolName}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Input</p>
                <pre className="overflow-x-auto rounded-lg bg-secondary p-3 text-xs">{JSON.stringify(selected.input, null, 2)}</pre>
              </div>
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Output</p>
                <pre className="overflow-x-auto rounded-lg bg-secondary p-3 text-xs">
                  {typeof selected.output === "string" ? selected.output : JSON.stringify(selected.output, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
