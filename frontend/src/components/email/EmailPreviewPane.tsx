import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ListPlus, Mail, PenLine, Send, ShieldCheck, Sparkles, Star } from "lucide-react";
import * as React from "react";
import { EmailLabelBadge } from "./EmailLabelBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { formatDate, formatTime, initials } from "@/lib/utils";
import { approvalService } from "@/services/approvalService";
import { emailService } from "@/services/emailService";
import type { EmailMessage } from "@/types";

export function EmailPreviewPane({ email }: { email?: EmailMessage }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [draft, setDraft] = React.useState<string | null>(null);
  const [tasks, setTasks] = React.useState<string[] | null>(null);
  const [sentForApproval, setSentForApproval] = React.useState(false);

  const summaryMutation = useMutation({ mutationFn: (id: string) => emailService.summarize(id) });
  const draftMutation = useMutation({
    mutationFn: (id: string) => emailService.draftReply(id),
    onSuccess: (result) => setDraft(result),
  });
  const tasksMutation = useMutation({
    mutationFn: (id: string) => emailService.extractTasks(id),
    onSuccess: (result) => {
      setTasks(result);
      toast({ title: `${result.length} tasks extracted`, description: result.join(", ") });
    },
  });
  const sendMutation = useMutation({
    mutationFn: () =>
      approvalService.request({
        type: "send_email",
        title: `Send email to ${email!.sender.name}`,
        context: `Re: ${email!.subject}`,
        target: email!.sender.email,
        aiDraft: draft!,
      }),
    onSuccess: () => {
      setSentForApproval(true);
      queryClient.invalidateQueries({ queryKey: ["approvals", "list"] });
      toast({ title: "Sent for approval", description: "This reply won't go out until you approve it in the Approval Center." });
    },
  });

  React.useEffect(() => {
    setDraft(null);
    setTasks(null);
    setSentForApproval(false);
    summaryMutation.reset();
  }, [email?.id]);

  if (!email) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <EmptyState icon={Mail} title="No email selected" description="Choose an email from the list to preview it here." />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border p-4">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-base font-semibold leading-snug">{email.subject}</h2>
          <Button variant="ghost" size="icon-sm" aria-label="Mark important">
            <Star className={email.isImportant ? "h-4 w-4 fill-warning text-warning" : "h-4 w-4"} />
          </Button>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback>{initials(email.sender.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{email.sender.name}</p>
            <p className="truncate text-xs text-muted-foreground">{email.sender.email}</p>
          </div>
          <p className="shrink-0 text-xs text-muted-foreground">
            {formatDate(email.timestamp)} · {formatTime(email.timestamp)}
          </p>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {email.labels.map((l) => (
            <EmailLabelBadge key={l} label={l} />
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
        <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">{email.body}</p>

        {summaryMutation.data && (
          <div className="mt-4 rounded-lg border border-primary/20 bg-primary/[0.05] p-3">
            <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-primary">
              <Sparkles className="h-3 w-3" /> AI Summary
            </p>
            <p className="text-sm">{summaryMutation.data}</p>
          </div>
        )}

        {tasks && tasks.length > 0 && (
          <div className="mt-4 rounded-lg border border-border bg-secondary/40 p-3">
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">Extracted tasks</p>
            <ul className="space-y-1 text-sm">
              {tasks.map((t) => (
                <li key={t}>• {t}</li>
              ))}
            </ul>
          </div>
        )}

        {draft && (
          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Drafted reply</p>
              {sentForApproval && (
                <Badge variant="warning" className="gap-1">
                  <ShieldCheck className="h-3 w-3" />
                  Awaiting approval
                </Badge>
              )}
            </div>
            <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={6} readOnly={sentForApproval} />
          </div>
        )}
      </div>

      <Separator />
      <div className="flex flex-wrap gap-2 p-3">
        <Button variant="outline" size="sm" onClick={() => summaryMutation.mutate(email.id)} disabled={summaryMutation.isPending}>
          <Sparkles className="h-3.5 w-3.5" />
          Summarize
        </Button>
        <Button variant="outline" size="sm" onClick={() => tasksMutation.mutate(email.id)} disabled={tasksMutation.isPending}>
          <ListPlus className="h-3.5 w-3.5" />
          Extract tasks
        </Button>
        <Button variant="outline" size="sm" onClick={() => draftMutation.mutate(email.id)} disabled={draftMutation.isPending}>
          <PenLine className="h-3.5 w-3.5" />
          Draft reply
        </Button>
        {draft && (
          <Button size="sm" className="ml-auto" onClick={() => sendMutation.mutate()} disabled={sendMutation.isPending || sentForApproval}>
            <Send className="h-3.5 w-3.5" />
            {sentForApproval ? "Sent for approval" : "Send"}
          </Button>
        )}
      </div>
    </div>
  );
}
