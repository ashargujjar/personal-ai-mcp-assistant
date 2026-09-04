import { CalendarPlus, CalendarX2, Check, Mail, Trash2, X } from "lucide-react";
import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { ConfirmationDecision, PendingConfirmation } from "@/types";

const actionConfig = {
  send_email: { icon: Mail, label: "Send email" },
  delete_email: { icon: Trash2, label: "Delete email" },
  create_event: { icon: CalendarPlus, label: "Create calendar event" },
  delete_event: { icon: CalendarX2, label: "Delete calendar event" },
} as const;

function formatEventTime(value: unknown): string {
  if (typeof value !== "string") return String(value);
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function ConfirmationCard({
  confirmation,
  onDecide,
}: {
  confirmation: PendingConfirmation;
  onDecide: (decision: ConfirmationDecision) => void;
}) {
  const [editing, setEditing] = React.useState(false);
  const [editMessage, setEditMessage] = React.useState("");

  const { icon: Icon, label } = actionConfig[confirmation.action];
  const args = confirmation.args;
  const resolved = confirmation.resolved;

  return (
    <Card className="max-w-[85%] p-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium">{label}</p>
            <Badge variant="secondary">Needs approval</Badge>
          </div>
          {confirmation.action === "send_email" && (
            <p className="mt-0.5 font-mono text-xs text-muted-foreground">To: {String(args.to)}</p>
          )}
          {confirmation.action === "delete_email" && (
            <p className="mt-0.5 font-mono text-xs text-muted-foreground">
              Message: {String(args.message_id)}
            </p>
          )}
          {confirmation.action === "create_event" && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {formatEventTime(args.start)} – {formatEventTime(args.end)}
            </p>
          )}
          {confirmation.action === "delete_event" && (
            <p className="mt-0.5 font-mono text-xs text-muted-foreground">
              Event: {String(args.event_id)}
            </p>
          )}
        </div>
        {resolved && (
          <Badge variant={resolved === "reject" ? "destructive" : "success"} className="shrink-0 capitalize">
            {resolved === "reject" ? "Rejected" : resolved === "edit" ? "Instruction sent" : "Approved"}
          </Badge>
        )}
      </div>

      {confirmation.action === "send_email" && (
        <div className="mt-3 space-y-1 rounded-lg border border-border bg-muted/30 p-2.5 text-sm">
          <p className="font-medium">{String(args.subject)}</p>
          <p className="whitespace-pre-wrap text-muted-foreground">{String(args.body)}</p>
        </div>
      )}

      {confirmation.action === "create_event" && (
        <div className="mt-3 space-y-1 rounded-lg border border-border bg-muted/30 p-2.5 text-sm">
          <p className="font-medium">{String(args.title)}</p>
          {Boolean(args.description) && (
            <p className="whitespace-pre-wrap text-muted-foreground">{String(args.description)}</p>
          )}
          {Array.isArray(args.attendees) && args.attendees.length > 0 && (
            <p className="font-mono text-xs text-muted-foreground">Attendees: {args.attendees.join(", ")}</p>
          )}
        </div>
      )}

      {editing && !resolved && (
        <Textarea
          autoFocus
          value={editMessage}
          onChange={(e) => setEditMessage(e.target.value)}
          placeholder="Tell the assistant what to change instead..."
          rows={3}
          className="mt-3 resize-none text-sm"
        />
      )}

      {!resolved && (
        <div className="mt-3 flex items-center justify-end gap-2">
          {editing ? (
            <>
              <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={!editMessage.trim()}
                onClick={() => onDecide({ type: "edit", message: editMessage.trim() })}
              >
                Send instruction
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={() => onDecide({ type: "reject" })}>
                <X className="h-3.5 w-3.5" />
                Reject
              </Button>
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                Edit instead
              </Button>
              <Button size="sm" onClick={() => onDecide({ type: "accept" })}>
                <Check className="h-3.5 w-3.5" />
                Approve
              </Button>
            </>
          )}
        </div>
      )}
    </Card>
  );
}
