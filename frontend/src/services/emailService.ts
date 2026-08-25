import { emails as seedEmails } from "@/mock/email";
import { sleep } from "@/lib/utils";
import type { EmailFolder, EmailMessage } from "@/types";

let emails: EmailMessage[] = [...seedEmails];

export const emailService = {
  async listByFolder(folder: EmailFolder): Promise<EmailMessage[]> {
    await sleep(200);
    return emails
      .filter((e) => e.folder === folder)
      .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
  },

  async get(id: string): Promise<EmailMessage | undefined> {
    await sleep(120);
    return emails.find((e) => e.id === id);
  },

  async markRead(id: string): Promise<void> {
    await sleep(100);
    emails = emails.map((e) => (e.id === id ? { ...e, isRead: true } : e));
  },

  async markImportant(id: string, important: boolean): Promise<void> {
    await sleep(150);
    emails = emails.map((e) => (e.id === id ? { ...e, isImportant: important } : e));
  },

  async summarize(id: string): Promise<string> {
    await sleep(700);
    const email = emails.find((e) => e.id === id);
    if (!email) return "Email not found.";
    return `**Summary:** ${email.sender.name} is asking about "${email.subject.toLowerCase()}". Key points extracted from the message body, condensed to the essentials — no action needed to read the full thread.`;
  },

  async extractTasks(id: string): Promise<string[]> {
    await sleep(650);
    const email = emails.find((e) => e.id === id);
    if (!email) return [];
    return [`Follow up on: ${email.subject}`, `Reply to ${email.sender.name}`];
  },

  async draftReply(id: string): Promise<string> {
    await sleep(800);
    const email = emails.find((e) => e.id === id);
    if (!email) return "";
    return `Hi ${email.sender.name.split(" ")[0]},\n\nThanks for the note — I'll take a look and get back to you shortly with an update.\n\nBest,\nAshar`;
  },
};
