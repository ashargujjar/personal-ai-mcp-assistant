import {
  BrainCircuit,
  FileSearch,
  Github,
  ListPlus,
  Mail,
  Target,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import type { QuickAction } from "@/types";

const icons: Record<string, LucideIcon> = {
  Mail,
  Target,
  Users,
  FileSearch,
  Github,
  ListPlus,
  BrainCircuit,
};

export function QuickActionsGrid({ actions, onSelect }: { actions: QuickAction[]; onSelect: (prompt: string) => void }) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {actions.map((action) => {
        const Icon = icons[action.icon] ?? Target;
        return (
          <Card
            key={action.id}
            role="button"
            tabIndex={0}
            onClick={() => onSelect(action.prompt)}
            onKeyDown={(e) => e.key === "Enter" && onSelect(action.prompt)}
            className="flex cursor-pointer items-center gap-3 p-3.5 transition-colors hover:border-primary/40 hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-4 w-4" />
            </div>
            <span className="text-sm font-medium">{action.label}</span>
          </Card>
        );
      })}
    </div>
  );
}
