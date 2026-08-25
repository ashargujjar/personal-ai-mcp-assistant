import { cn } from "@/lib/utils";
import type { ConnectionStatus } from "@/types";

const statusClasses: Record<ConnectionStatus, string> = {
  connected: "bg-success",
  disconnected: "bg-muted-foreground/40",
  error: "bg-destructive",
  connecting: "bg-warning animate-pulse-dot",
};

export function StatusDot({ status, className }: { status: ConnectionStatus; className?: string }) {
  return <span className={cn("inline-block h-2 w-2 rounded-full", statusClasses[status], className)} />;
}
