import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Circle, FileText, Mail, Users } from "lucide-react";
import * as React from "react";
import { useSearchParams } from "react-router-dom";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatDate } from "@/lib/utils";
import { meetingService } from "@/services/meetingService";
import type { Meeting } from "@/types";

export default function Meetings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const meetingsQuery = useQuery({ queryKey: ["meetings", "list"], queryFn: meetingService.list });

  const toggleMutation = useMutation({
    mutationFn: ({ meetingId, itemId }: { meetingId: string; itemId: string }) => meetingService.toggleActionItem(meetingId, itemId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["meetings", "list"] }),
  });

  const selected: Meeting | undefined = meetingsQuery.data?.find((m) => m.id === searchParams.get("id")) ?? meetingsQuery.data?.[0];

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <PageHeader title="Meetings" subtitle="Summaries, decisions, and action items from every meeting NEXUS has joined." />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
        <div className="space-y-2">
          {meetingsQuery.isLoading ? (
            [1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)
          ) : (
            meetingsQuery.data?.map((meeting) => (
              <Card
                key={meeting.id}
                role="button"
                tabIndex={0}
                onClick={() => setSearchParams({ id: meeting.id })}
                className={cn("cursor-pointer p-3.5 transition-colors hover:border-primary/40", selected?.id === meeting.id && "border-primary/60 bg-accent/40")}
              >
                <p className="text-sm font-medium leading-snug">{meeting.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDate(meeting.date)} · {meeting.durationMinutes} min
                </p>
              </Card>
            ))
          )}
        </div>

        {selected ? (
          <Card className="p-5">
            <h2 className="text-base font-semibold">{selected.title}</h2>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users className="h-3 w-3" />
              {selected.participants.join(", ")} · {formatDate(selected.date)}
            </p>

            <p className="mt-4 text-sm leading-relaxed">{selected.summary}</p>

            {selected.keyDecisions.length > 0 && (
              <>
                <Separator className="my-4" />
                <SectionTitle>Key Decisions</SectionTitle>
                <ul className="mt-2 space-y-1.5">
                  {selected.keyDecisions.map((d) => (
                    <li key={d} className="flex gap-2 text-sm">
                      <span className="text-primary">•</span>
                      {d}
                    </li>
                  ))}
                </ul>
              </>
            )}

            {selected.actionItems.length > 0 && (
              <>
                <Separator className="my-4" />
                <SectionTitle>Action Items</SectionTitle>
                <ul className="mt-2 space-y-2">
                  {selected.actionItems.map((item) => (
                    <li key={item.id}>
                      <button
                        onClick={() => toggleMutation.mutate({ meetingId: selected.id, itemId: item.id })}
                        className="flex w-full items-start gap-2 text-left text-sm"
                      >
                        {item.done ? (
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                        ) : (
                          <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                        )}
                        <span className={cn(item.done && "text-muted-foreground line-through")}>
                          {item.text}
                          {item.assignee && <span className="text-muted-foreground"> — {item.assignee}</span>}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {(selected.relatedEmailIds.length > 0 || selected.relatedDocumentIds.length > 0) && (
              <>
                <Separator className="my-4" />
                <SectionTitle>Related</SectionTitle>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {selected.relatedEmailIds.map((id) => (
                    <span key={id} className="flex items-center gap-1 rounded-lg border border-border px-2 py-1">
                      <Mail className="h-3 w-3" />
                      Related email
                    </span>
                  ))}
                  {selected.relatedDocumentIds.map((id) => (
                    <span key={id} className="flex items-center gap-1 rounded-lg border border-border px-2 py-1">
                      <FileText className="h-3 w-3" />
                      Related document
                    </span>
                  ))}
                </div>
              </>
            )}

            {selected.transcript.length > 0 && (
              <>
                <Separator className="my-4" />
                <SectionTitle>Transcript</SectionTitle>
                <div className="mt-2 space-y-2.5">
                  {selected.transcript.map((line, i) => (
                    <p key={i} className="text-sm">
                      <span className="font-medium">{line.speaker}</span>{" "}
                      <span className="text-xs text-muted-foreground">{line.timestamp}</span>
                      <br />
                      <span className="text-muted-foreground">{line.text}</span>
                    </p>
                  ))}
                </div>
              </>
            )}
          </Card>
        ) : (
          <EmptyState icon={Users} title="No meetings yet" />
        )}
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{children}</p>;
}
