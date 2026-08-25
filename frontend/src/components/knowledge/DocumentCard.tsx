import { AlertCircle, FileText, Loader2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn, formatBytes, formatRelativeTime } from "@/lib/utils";
import type { KnowledgeDocument } from "@/types";

const statusConfig = {
  ready: { label: "Ready", variant: "success" as const },
  processing: { label: "Processing", variant: "warning" as const },
  error: { label: "Failed", variant: "destructive" as const },
};

export function DocumentCard({ doc, onDelete }: { doc: KnowledgeDocument; onDelete: (id: string) => void }) {
  const status = statusConfig[doc.status];
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary")}>
          {doc.status === "processing" ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : doc.status === "error" ? (
            <AlertCircle className="h-4 w-4 text-destructive" />
          ) : (
            <FileText className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{doc.filename}</p>
          {doc.summary && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{doc.summary}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant={status.variant}>{status.label}</Badge>
            <span>{formatBytes(doc.sizeKb * 1024)}</span>
            {doc.pageCount && (
              <>
                <span>·</span>
                <span>{doc.pageCount} pages</span>
              </>
            )}
            <span>·</span>
            <span>{formatRelativeTime(doc.uploadedAt)}</span>
          </div>
        </div>
        <Button variant="ghost" size="icon-sm" className="shrink-0 text-muted-foreground hover:text-destructive" onClick={() => onDelete(doc.id)} aria-label="Delete document">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </Card>
  );
}
