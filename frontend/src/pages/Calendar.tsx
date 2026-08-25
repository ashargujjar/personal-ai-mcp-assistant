import { useQuery } from "@tanstack/react-query";
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight, MapPin, Sparkles, Users, Video } from "lucide-react";
import * as React from "react";
import { MeetingBriefModal } from "@/components/calendar/MeetingBriefModal";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn, formatTime } from "@/lib/utils";
import { calendarService } from "@/services/calendarService";
import { meetingBriefs } from "@/mock/calendar";
import type { CalendarEvent } from "@/types";

const TODAY = new Date("2026-08-22T09:00:00");

type ViewMode = "day" | "week" | "month";

export default function Calendar() {
  const [view, setView] = React.useState<ViewMode>("week");
  const [cursor, setCursor] = React.useState(TODAY);
  const [briefEvent, setBriefEvent] = React.useState<CalendarEvent | null>(null);

  const events = useQuery({ queryKey: ["calendar", "events"], queryFn: calendarService.listEvents });

  function shift(direction: 1 | -1) {
    if (view === "day") setCursor((d) => addDays(d, direction));
    else if (view === "week") setCursor((d) => addWeeks(d, direction));
    else setCursor((d) => addMonths(d, direction));
  }

  const eventsForDay = (day: Date) => events.data?.filter((e) => isSameDay(new Date(e.start), day)) ?? [];

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <PageHeader
        title="Calendar"
        subtitle="Your schedule, synced across connected calendars."
        actions={
          <Tabs value={view} onValueChange={(v) => setView(v as ViewMode)}>
            <TabsList>
              <TabsTrigger value="day">Day</TabsTrigger>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
            </TabsList>
          </Tabs>
        }
      />

      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">
          {view === "month" ? format(cursor, "MMMM yyyy") : view === "week" ? `Week of ${format(startOfWeek(cursor), "MMM d")}` : format(cursor, "EEEE, MMMM d")}
        </p>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon-sm" onClick={() => shift(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCursor(TODAY)}>
            Today
          </Button>
          <Button variant="outline" size="icon-sm" onClick={() => shift(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {events.isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : view === "day" ? (
        <DayView day={cursor} events={eventsForDay(cursor)} onPrepare={setBriefEvent} />
      ) : view === "week" ? (
        <WeekView cursor={cursor} eventsForDay={eventsForDay} onSelectDay={(d) => { setCursor(d); setView("day"); }} />
      ) : (
        <MonthView cursor={cursor} eventsForDay={eventsForDay} onSelectDay={(d) => { setCursor(d); setView("day"); }} />
      )}

      <MeetingBriefModal event={briefEvent} open={!!briefEvent} onOpenChange={(o) => !o && setBriefEvent(null)} />
    </div>
  );
}

function DayView({ day, events, onPrepare }: { day: Date; events: CalendarEvent[]; onPrepare: (e: CalendarEvent) => void }) {
  if (events.length === 0) {
    return <EmptyState icon={Users} title="No events" description={`Nothing scheduled for ${format(day, "MMMM d")}.`} />;
  }

  return (
    <div className="space-y-3">
      {events.map((event) => (
        <Card key={event.id} className="p-4">
          <div className="flex items-start gap-4">
            <div className="w-20 shrink-0 pt-0.5 text-xs font-medium text-muted-foreground">
              {formatTime(event.start)}
              <br />
              {formatTime(event.end)}
            </div>
            <div
              className="mt-0.5 h-full w-1 shrink-0 self-stretch rounded-full"
              style={{ backgroundColor: `hsl(${event.color})` }}
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{event.title}</p>
              {event.description && <p className="mt-1 text-xs text-muted-foreground">{event.description}</p>}
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
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
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {event.attendees.join(", ")}
                </span>
              </div>
            </div>
            {meetingBriefs[event.id] && (
              <Button variant="outline" size="sm" onClick={() => onPrepare(event)} className="shrink-0">
                <Sparkles className="h-3.5 w-3.5" />
                Prepare
              </Button>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}

function WeekView({
  cursor,
  eventsForDay,
  onSelectDay,
}: {
  cursor: Date;
  eventsForDay: (day: Date) => CalendarEvent[];
  onSelectDay: (day: Date) => void;
}) {
  const days = eachDayOfInterval({ start: startOfWeek(cursor), end: endOfWeek(cursor) });

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-7">
      {days.map((day) => {
        const dayEvents = eventsForDay(day);
        const isToday = isSameDay(day, TODAY);
        return (
          <div key={day.toISOString()} className="flex flex-col gap-2">
            <button
              onClick={() => onSelectDay(day)}
              className={cn(
                "flex items-center justify-between rounded-md px-2 py-1 text-left text-xs font-medium",
                isToday ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent"
              )}
            >
              <span>{format(day, "EEE d")}</span>
            </button>
            <div className="flex flex-1 flex-col gap-1.5">
              {dayEvents.length === 0 ? (
                <div className="rounded-md border border-dashed border-border/60 p-2 text-center text-[11px] text-muted-foreground/60">—</div>
              ) : (
                dayEvents.map((event) => (
                  <div
                    key={event.id}
                    className="rounded-md border border-border bg-card p-2 text-xs"
                    style={{ borderLeftColor: `hsl(${event.color})`, borderLeftWidth: 3 }}
                  >
                    <p className="font-medium leading-tight">{event.title}</p>
                    <p className="mt-0.5 text-muted-foreground">{formatTime(event.start)}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MonthView({
  cursor,
  eventsForDay,
  onSelectDay,
}: {
  cursor: Date;
  eventsForDay: (day: Date) => CalendarEvent[];
  onSelectDay: (day: Date) => void;
}) {
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(cursor)),
    end: endOfWeek(endOfMonth(cursor)),
  });

  return (
    <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-border bg-border">
      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
        <div key={d} className="bg-secondary p-2 text-center text-[11px] font-medium text-muted-foreground">
          {d}
        </div>
      ))}
      {days.map((day) => {
        const dayEvents = eventsForDay(day);
        const inMonth = isSameMonth(day, cursor);
        const isToday = isSameDay(day, TODAY);
        return (
          <button
            key={day.toISOString()}
            onClick={() => onSelectDay(day)}
            className={cn(
              "flex min-h-20 flex-col items-start gap-1 bg-background p-2 text-left transition-colors hover:bg-accent/50",
              !inMonth && "text-muted-foreground/40"
            )}
          >
            <span className={cn("text-xs", isToday && "flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground")}>
              {format(day, "d")}
            </span>
            <div className="flex flex-wrap gap-0.5">
              {dayEvents.slice(0, 3).map((e) => (
                <span key={e.id} className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: `hsl(${e.color})` }} />
              ))}
              {dayEvents.length > 3 && <span className="text-[10px] text-muted-foreground">+{dayEvents.length - 3}</span>}
            </div>
          </button>
        );
      })}
    </div>
  );
}
