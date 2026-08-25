import { Calendar as CalendarIcon, MapPin, Video } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatTime } from "@/lib/utils";
import type { CalendarEvent } from "@/types";

export function ScheduleTimeline({ events, isLoading }: { events?: CalendarEvent[]; isLoading: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Today's Schedule</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : !events || events.length === 0 ? (
          <EmptyState icon={CalendarIcon} title="No events today" description="Enjoy the clear calendar." />
        ) : (
          <ol className="relative space-y-0 border-l border-border pl-4">
            {events.map((event) => (
              <li key={event.id} className="relative pb-5 last:pb-0">
                <span
                  className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full ring-4 ring-background"
                  style={{ backgroundColor: `hsl(${event.color})` }}
                />
                <p className="text-xs font-medium text-muted-foreground">
                  {formatTime(event.start)} – {formatTime(event.end)}
                </p>
                <p className="mt-0.5 text-sm font-medium">{event.title}</p>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  {event.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {event.location}
                    </span>
                  )}
                  {event.meetingLink && (
                    <span className="flex items-center gap-1">
                      <Video className="h-3 w-3" />
                      Video call
                    </span>
                  )}
                  {event.attendees.length > 0 && <span>{event.attendees.length} attendees</span>}
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
