import { AlertTriangle, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type PermissionLevel = "allowed" | "approval" | "disabled";

const config: Record<PermissionLevel, { icon: typeof Check; label: string; className: string }> = {
  allowed: { icon: Check, label: "Allowed", className: "text-success" },
  approval: { icon: AlertTriangle, label: "Approval required", className: "text-warning" },
  disabled: { icon: X, label: "Disabled", className: "text-destructive" },
};

export function PermissionRow({ label, level }: { label: string; level: PermissionLevel }) {
  const { icon: Icon, label: text, className } = config[level];
  return (
    <div className="flex items-center justify-between py-2 text-sm">
      <span>{label}</span>
      <span className={cn("flex items-center gap-1.5 text-xs font-medium", className)}>
        <Icon className="h-3.5 w-3.5" />
        {text}
      </span>
    </div>
  );
}
