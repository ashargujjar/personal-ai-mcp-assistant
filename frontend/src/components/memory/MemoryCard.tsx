import { Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatRelativeTime } from "@/lib/utils";
import type { Memory, MemoryCategory } from "@/types";

const categoryVariant: Record<MemoryCategory, "default" | "secondary" | "success" | "warning" | "muted"> = {
  preference: "default",
  fact: "secondary",
  skill: "success",
  relationship: "warning",
  project: "muted",
};

export function MemoryCard({ memory, onDelete }: { memory: Memory; onDelete: (id: string) => void }) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm leading-relaxed">{memory.content}</p>
        <Button
          variant="ghost"
          size="icon-sm"
          className="shrink-0 text-muted-foreground hover:text-destructive"
          onClick={() => onDelete(memory.id)}
          aria-label="Delete memory"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Badge variant={categoryVariant[memory.category]}>{memory.category}</Badge>
        <span>·</span>
        <span>{memory.source}</span>
        <span>·</span>
        <span>{formatRelativeTime(memory.createdAt)}</span>
      </div>
    </Card>
  );
}
