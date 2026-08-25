import { Badge } from "@/components/ui/badge";
import type { EmailLabel } from "@/types";

const config: Record<EmailLabel, { label: string; variant: "destructive" | "default" | "muted" | "secondary" | "warning" }> = {
  urgent: { label: "Urgent", variant: "destructive" },
  work: { label: "Work", variant: "default" },
  personal: { label: "Personal", variant: "muted" },
  newsletter: { label: "Newsletter", variant: "secondary" },
  "action-required": { label: "Action Required", variant: "warning" },
};

export function EmailLabelBadge({ label }: { label: EmailLabel }) {
  const { label: text, variant } = config[label];
  return (
    <Badge variant={variant} className="text-[10px]">
      {text}
    </Badge>
  );
}
