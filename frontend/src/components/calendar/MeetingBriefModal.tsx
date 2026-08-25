import { useQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { calendarService } from "@/services/calendarService";
import type { CalendarEvent } from "@/types";

export function MeetingBriefModal({
  event,
  open,
  onOpenChange,
}: {
  event: CalendarEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const brief = useQuery({
    queryKey: ["calendar", "brief", event?.id],
    queryFn: () => calendarService.getMeetingBrief(event!.id),
    enabled: !!event && open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Meeting Brief</DialogTitle>
          <DialogDescription>{event?.title}</DialogDescription>
        </DialogHeader>

        {brief.isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : !brief.data ? (
          <p className="text-sm text-muted-foreground">No brief available for this meeting yet.</p>
        ) : (
          <div className="space-y-4 text-sm">
            <Section title="Participants">
              <ul className="space-y-1">
                {brief.data.participants.map((p) => (
                  <li key={p.name}>
                    <span className="font-medium">{p.name}</span> <span className="text-muted-foreground">— {p.role}</span>
                  </li>
                ))}
              </ul>
            </Section>
            <Section title="Previous Conversations">
              <List items={brief.data.previousConversations} />
            </Section>
            <Section title="Relevant Documents">
              <List items={brief.data.relevantDocuments} />
            </Section>
            <Section title="Open Tasks">
              <List items={brief.data.openTasks} />
            </Section>
            <Section title="Recent GitHub Activity">
              <List items={brief.data.recentGithubActivity} />
            </Section>
            <Section title="AI Suggested Questions" icon>
              <List items={brief.data.suggestedQuestions} />
            </Section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, children, icon }: { title: string; children: React.ReactNode; icon?: boolean }) {
  return (
    <div>
      <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {icon && <Sparkles className="h-3 w-3 text-primary" />}
        {title}
      </p>
      {children}
    </div>
  );
}

function List({ items }: { items: string[] }) {
  if (items.length === 0) return <p className="text-muted-foreground">Nothing found.</p>;
  return (
    <ul className="space-y-1">
      {items.map((item) => (
        <li key={item} className="flex gap-2">
          <span className="text-primary">•</span>
          {item}
        </li>
      ))}
    </ul>
  );
}
