import type { ID } from "./common";

export type EmailFolder = "inbox" | "important" | "sent" | "drafts" | "archive";

export type EmailLabel = "urgent" | "work" | "personal" | "newsletter" | "action-required";

export interface EmailMessage {
  id: ID;
  folder: EmailFolder;
  sender: { name: string; email: string };
  subject: string;
  preview: string;
  body: string;
  timestamp: string;
  isRead: boolean;
  isImportant: boolean;
  labels: EmailLabel[];
  hasAttachments: boolean;
}
