import { calendarEvents, meetingBriefs } from "@/mock/calendar";
import { sleep } from "@/lib/utils";
import type { CalendarEvent, MeetingBrief } from "@/types";

export const calendarService = {
  async listEvents(): Promise<CalendarEvent[]> {
    await sleep(200);
    return [...calendarEvents].sort((a, b) => (a.start > b.start ? 1 : -1));
  },

  async getEventsForDate(date: Date): Promise<CalendarEvent[]> {
    await sleep(150);
    const key = date.toISOString().slice(0, 10);
    return calendarEvents
      .filter((e) => e.start.slice(0, 10) === key)
      .sort((a, b) => (a.start > b.start ? 1 : -1));
  },

  async getMeetingBrief(eventId: string): Promise<MeetingBrief | undefined> {
    await sleep(600);
    return meetingBriefs[eventId];
  },
};
