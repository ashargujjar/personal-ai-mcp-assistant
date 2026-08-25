import type { ID } from "./common";

export interface TranscriptLine {
  speaker: string;
  timestamp: string;
  text: string;
}

export interface ActionItem {
  id: ID;
  text: string;
  assignee?: string;
  done: boolean;
}

export interface Meeting {
  id: ID;
  title: string;
  date: string;
  durationMinutes: number;
  participants: string[];
  summary: string;
  keyDecisions: string[];
  actionItems: ActionItem[];
  followUps: string[];
  relatedEmailIds: ID[];
  relatedDocumentIds: ID[];
  transcript: TranscriptLine[];
}
