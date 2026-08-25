import { notes as seedNotes } from "@/mock/notes";
import { sleep } from "@/lib/utils";
import type { Note } from "@/types";

let notes: Note[] = [...seedNotes];

export const notesService = {
  async list(query?: string): Promise<Note[]> {
    await sleep(200);
    const sorted = [...notes].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
    if (!query?.trim()) return sorted;
    const q = query.toLowerCase();
    return sorted.filter((n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q) || n.tags.some((t) => t.includes(q)));
  },

  async create(): Promise<Note> {
    await sleep(200);
    const note: Note = {
      id: `note-new-${Date.now()}`,
      title: "Untitled note",
      content: "",
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    notes = [note, ...notes];
    return note;
  },

  async update(id: string, patch: Partial<Pick<Note, "title" | "content" | "tags">>): Promise<Note | undefined> {
    await sleep(200);
    notes = notes.map((n) => (n.id === id ? { ...n, ...patch, updatedAt: new Date().toISOString() } : n));
    return notes.find((n) => n.id === id);
  },

  async remove(id: string): Promise<void> {
    await sleep(200);
    notes = notes.filter((n) => n.id !== id);
  },
};
