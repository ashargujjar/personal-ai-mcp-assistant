import { documents } from "@/mock/knowledge";
import { issues, repositories } from "@/mock/github";
import { notes } from "@/mock/notes";
import { tasks } from "@/mock/tasks";
import { meetings } from "@/mock/meetings";
import { calendarEvents } from "@/mock/calendar";
import { sleep } from "@/lib/utils";
import type { SearchResultItem } from "@/types";

export type SearchScope = "all" | "github" | "document" | "note" | "task" | "meeting" | "calendar";

export const searchService = {
  async search(query: string, scope: SearchScope = "all"): Promise<SearchResultItem[]> {
    await sleep(180);
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const results: SearchResultItem[] = [];

    if (scope === "all" || scope === "github") {
      issues
        .filter((i) => i.title.toLowerCase().includes(q))
        .forEach((i) => {
          const repo = repositories.find((r) => r.id === i.repoId);
          results.push({ id: i.id, type: "github", title: `#${i.number} ${i.title}`, subtitle: repo?.name ?? "", path: `/github?repo=${i.repoId}` });
        });
      repositories
        .filter((r) => r.name.toLowerCase().includes(q) || r.description.toLowerCase().includes(q))
        .forEach((r) => results.push({ id: r.id, type: "github", title: r.name, subtitle: r.description, path: `/github?repo=${r.id}` }));
    }
    if (scope === "all" || scope === "document") {
      documents
        .filter((d) => d.filename.toLowerCase().includes(q))
        .forEach((d) => results.push({ id: d.id, type: "document", title: d.filename, subtitle: "Knowledge Base", path: `/knowledge` }));
    }
    if (scope === "all" || scope === "note") {
      notes
        .filter((n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q))
        .forEach((n) => results.push({ id: n.id, type: "note", title: n.title, subtitle: n.tags.join(", "), path: `/notes` }));
    }
    if (scope === "all" || scope === "task") {
      tasks
        .filter((t) => t.title.toLowerCase().includes(q))
        .forEach((t) => results.push({ id: t.id, type: "task", title: t.title, subtitle: t.project ?? "", path: `/tasks` }));
    }
    if (scope === "all" || scope === "meeting") {
      meetings
        .filter((m) => m.title.toLowerCase().includes(q))
        .forEach((m) => results.push({ id: m.id, type: "meeting", title: m.title, subtitle: new Date(m.date).toLocaleDateString(), path: `/meetings?id=${m.id}` }));
    }
    if (scope === "all" || scope === "calendar") {
      calendarEvents
        .filter((e) => e.title.toLowerCase().includes(q))
        .forEach((e) => results.push({ id: e.id, type: "calendar", title: e.title, subtitle: new Date(e.start).toLocaleString(), path: `/calendar` }));
    }

    return results.slice(0, 30);
  },
};
