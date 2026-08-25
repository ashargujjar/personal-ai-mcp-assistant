import { useQuery } from "@tanstack/react-query";
import { Archive, Inbox, Send, Star, FileEdit } from "lucide-react";
import * as React from "react";
import { EmailPreviewPane } from "@/components/email/EmailPreviewPane";
import { EmailLabelBadge } from "@/components/email/EmailLabelBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatRelativeTime } from "@/lib/utils";
import { emailService } from "@/services/emailService";
import type { EmailFolder } from "@/types";

const folders: { key: EmailFolder; label: string; icon: typeof Inbox }[] = [
  { key: "inbox", label: "Inbox", icon: Inbox },
  { key: "important", label: "Important", icon: Star },
  { key: "sent", label: "Sent", icon: Send },
  { key: "drafts", label: "Drafts", icon: FileEdit },
  { key: "archive", label: "Archive", icon: Archive },
];

export default function Email() {
  const [folder, setFolder] = React.useState<EmailFolder>("inbox");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const emails = useQuery({ queryKey: ["email", "list", folder], queryFn: () => emailService.listByFolder(folder) });

  React.useEffect(() => {
    setSelectedId(emails.data?.[0]?.id ?? null);
  }, [emails.data]);

  const selectedEmail = emails.data?.find((e) => e.id === selectedId);

  return (
    <div className="flex h-full">
      <aside className="hidden w-48 shrink-0 border-r border-border p-3 md:block">
        <h2 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mail</h2>
        <nav className="space-y-0.5">
          {folders.map((f) => (
            <button
              key={f.key}
              onClick={() => setFolder(f.key)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
                folder === f.key ? "bg-accent font-medium text-foreground" : "text-muted-foreground hover:bg-accent/60"
              )}
            >
              <f.icon className="h-4 w-4" />
              {f.label}
            </button>
          ))}
        </nav>
      </aside>

      <section className="w-full shrink-0 border-r border-border sm:w-80">
        <div className="border-b border-border px-4 py-3">
          <h1 className="text-sm font-semibold capitalize">{folder}</h1>
        </div>
        <div className="h-[calc(100%-49px)] overflow-y-auto scrollbar-thin">
          {emails.isLoading ? (
            <div className="space-y-3 p-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !emails.data || emails.data.length === 0 ? (
            <EmptyState icon={Inbox} title="No emails here" className="border-0" />
          ) : (
            emails.data.map((email) => (
              <button
                key={email.id}
                onClick={() => setSelectedId(email.id)}
                className={cn(
                  "flex w-full flex-col gap-1 border-b border-border/60 px-4 py-3 text-left transition-colors hover:bg-accent/40",
                  selectedId === email.id && "bg-accent/60"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={cn("truncate text-sm", !email.isRead && "font-semibold")}>{email.sender.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatRelativeTime(email.timestamp)}</span>
                </div>
                <p className={cn("truncate text-sm", !email.isRead && "font-medium")}>{email.subject}</p>
                <p className="truncate text-xs text-muted-foreground">{email.preview}</p>
                {email.labels.length > 0 && (
                  <div className="mt-0.5 flex gap-1">
                    {email.labels.slice(0, 2).map((l) => (
                      <EmailLabelBadge key={l} label={l} />
                    ))}
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      </section>

      <section className="hidden flex-1 sm:block">
        <EmailPreviewPane email={selectedEmail} />
      </section>
    </div>
  );
}
