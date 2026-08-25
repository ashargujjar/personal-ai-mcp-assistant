import { Badge } from "@/components/ui/badge";
import type { Priority } from "@/types";

const config: Record<Priority, { label: string; variant: "muted" | "default" | "warning" | "destructive" }> = {
  low: { label: "Low", variant: "muted" },
  medium: { label: "Medium", variant: "default" },
  high: { label: "High", variant: "warning" },
  urgent: { label: "Urgent", variant: "destructive" },
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  const { label, variant } = config[priority];
  return <Badge variant={variant}>{label}</Badge>;
}
