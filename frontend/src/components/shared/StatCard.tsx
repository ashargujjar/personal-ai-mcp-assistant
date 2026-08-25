import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: { value: string; direction: "up" | "down" | "flat" };
  accent?: "default" | "warning" | "destructive" | "success";
  className?: string;
}

const accentClasses: Record<NonNullable<StatCardProps["accent"]>, string> = {
  default: "text-primary bg-primary/10",
  warning: "text-warning bg-warning/10",
  destructive: "text-destructive bg-destructive/10",
  success: "text-success bg-success/10",
};

export function StatCard({ label, value, icon: Icon, trend, accent = "default", className }: StatCardProps) {
  return (
    <Card className={cn("p-5", className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-2xl font-semibold tracking-tight">{value}</p>
          <p className="mt-1 text-sm text-muted-foreground">{label}</p>
        </div>
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", accentClasses[accent])}>
          <Icon className="h-4.5 w-4.5" />
        </div>
      </div>
      {trend && (
        <p
          className={cn(
            "mt-3 text-xs font-medium",
            trend.direction === "up" && "text-success",
            trend.direction === "down" && "text-destructive",
            trend.direction === "flat" && "text-muted-foreground"
          )}
        >
          {trend.value}
        </p>
      )}
    </Card>
  );
}
