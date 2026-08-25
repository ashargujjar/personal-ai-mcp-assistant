import { ArrowRight, Trash2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { formatRelativeTime } from "@/lib/utils";
import type { Automation } from "@/types";

export function AutomationCard({
  automation,
  onToggle,
  onDelete,
}: {
  automation: Automation;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Zap className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-medium">{automation.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">{automation.description}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Switch checked={automation.isActive} onCheckedChange={() => onToggle(automation.id)} />
          <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-destructive" onClick={() => onDelete(automation.id)} aria-label="Delete automation">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-1.5 rounded-lg bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{automation.trigger}</span>
        <ArrowRight className="h-3 w-3" />
        <span>{automation.action}</span>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Ran {automation.runCount} times{automation.lastRunAt && ` · last run ${formatRelativeTime(automation.lastRunAt)}`}
      </p>
    </Card>
  );
}
