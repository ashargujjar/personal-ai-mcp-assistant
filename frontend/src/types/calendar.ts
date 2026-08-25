import type { ID } from "./common";

export interface CalendarEvent {
  id: ID;
  title: string;
  start: string;
  end: string;
  attendees: string[];
  location?: string;
  meetingLink?: string;
  description?: string;
  color: string;
}

export interface MeetingBrief {
  eventId: ID;
  participants: { name: string; role: string }[];
  previousConversations: string[];
  relevantDocuments: string[];
  openTasks: string[];
  recentGithubActivity: string[];
  suggestedQuestions: string[];
}
