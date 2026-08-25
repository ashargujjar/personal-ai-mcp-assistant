import { Check, CircleDot, Mail, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { formatRelativeTime } from "@/lib/utils";
import type { ApprovalType, PendingApproval } from "@/types";

const typeConfig: Record<ApprovalType, { icon: typeof Mail; label: string }> = {
  send_email: { icon: Mail, label: "Email" },
  github_issue: { icon: CircleDot, label: "Issue" },
};

const statusVariant = { pending: "warning", approved: "success", rejected: "destructive" } as const;

export function ApprovalCard({
  approval,
  onApprove,
  onReject,
  onSaveDraft,
}: {
  approval: PendingApproval;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onSaveDraft: (id: string, draft: string) => void;
}) {
  const { icon: Icon, label } = typeConfig[approval.type];
  const isPending = approval.status === "pending";

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium">{approval.title}</p>
            <Badge variant="secondary">{label}</Badge>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{approval.context}</p>
          <p className="mt-0.5 font-mono text-xs text-muted-foreground">{approval.target}</p>
        </div>
        <Badge variant={statusVariant[approval.status]} className="shrink-0 capitalize">
          {approval.status}
        </Badge>
      </div>

      <Textarea
        defaultValue={approval.aiDraft}
        readOnly={!isPending}
        onBlur={(e) => isPending && e.target.value !== approval.aiDraft && onSaveDraft(approval.id, e.target.value)}
        rows={4}
        className="mt-3 resize-none text-sm"
      />

      <div className="mt-3 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {isPending
            ? `Requested ${formatRelativeTime(approval.requestedAt)}`
            : `${approval.status === "approved" ? "Approved" : "Rejected"} ${formatRelativeTime(approval.resolvedAt ?? approval.requestedAt)}`}
        </p>
        {isPending && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onReject(approval.id)}>
              <X className="h-3.5 w-3.5" />
              Reject
            </Button>
            <Button size="sm" onClick={() => onApprove(approval.id)}>
              <Check className="h-3.5 w-3.5" />
              Approve
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
