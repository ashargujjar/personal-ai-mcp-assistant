import { meetings as seedMeetings } from "@/mock/meetings";
import { sleep } from "@/lib/utils";
import type { Meeting } from "@/types";

let meetings: Meeting[] = [...seedMeetings];

export const meetingService = {
  async list(): Promise<Meeting[]> {
    await sleep(200);
    return [...meetings].sort((a, b) => (a.date < b.date ? 1 : -1));
  },

  async get(id: string): Promise<Meeting | undefined> {
    await sleep(150);
    return meetings.find((m) => m.id === id);
  },

  async toggleActionItem(meetingId: string, itemId: string): Promise<Meeting | undefined> {
    await sleep(150);
    meetings = meetings.map((m) =>
      m.id === meetingId
        ? { ...m, actionItems: m.actionItems.map((a) => (a.id === itemId ? { ...a, done: !a.done } : a)) }
        : m
    );
    return meetings.find((m) => m.id === meetingId);
  },
};
