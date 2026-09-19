import { atsResultsBySubmissionId, resumeSubmissions } from "@/mock/resumes";
import { sleep } from "@/lib/utils";
import type { AtsResult, ResumeSearch, ResumeSubmission } from "@/types";

const STORAGE_KEY = "nexus-ai.resume-searches";

function readSearches(): ResumeSearch[] {
  if (typeof window === "undefined") return [];
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    if (!value) return [];
    return (JSON.parse(value) as ResumeSearch[]).map((search) => ({
      ...search,
      status: search.status ?? "ready",
    }));
  } catch {
    return [];
  }
}

function writeSearches(searches: ResumeSearch[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(searches.slice(0, 20)));
}

export const resumeService = {
  getSavedSearches(): ResumeSearch[] {
    return readSearches().sort((a, b) => (a.fetchedAt < b.fetchedAt ? 1 : -1));
  },

  saveSearch(input: Omit<ResumeSearch, "id" | "fetchedAt" | "status"> & { status?: ResumeSearch["status"] }): ResumeSearch {
    const search: ResumeSearch = {
      ...input,
      id: `resume-search-${Date.now()}`,
      fetchedAt: new Date().toISOString(),
      status: input.status ?? "queued",
    };
    writeSearches([search, ...readSearches()]);
    return search;
  },

  updateSearch(
    id: string,
    patch: Partial<Pick<ResumeSearch, "submissions" | "results" | "status" | "error">>,
  ): ResumeSearch | undefined {
    const updated = readSearches().map((search) => (search.id === id ? { ...search, ...patch } : search));
    writeSearches(updated);
    return updated.find((search) => search.id === id);
  },

  deleteSearch(id: string) {
    writeSearches(readSearches().filter((search) => search.id !== id));
  },

  async fetchFromGmail(
    input: { dateFrom: string; dateTo: string; jobTitle: string; description?: string },
    onStatus?: (status: "searching" | "downloading") => void,
  ): Promise<ResumeSubmission[]> {
    onStatus?.("searching");
    await sleep(700);
    onStatus?.("downloading");
    const from = new Date(input.dateFrom).getTime();
    const to = new Date(input.dateTo).getTime() + 24 * 60 * 60 * 1000 - 1;
    return resumeSubmissions
      .filter((r) => {
        const t = new Date(r.receivedAt).getTime();
        return t >= from && t <= to;
      })
      .map((r) => ({ ...r, jobTitle: input.jobTitle, description: input.description }))
      .sort((a, b) => (a.receivedAt < b.receivedAt ? 1 : -1));
  },

  async runAtsScan(submissions: ResumeSubmission[]): Promise<AtsResult[]> {
    await sleep(1400);
    return submissions
      .map((s) => {
        const result = atsResultsBySubmissionId[s.id];
        return result ? { submissionId: s.id, ...result } : null;
      })
      .filter((r): r is AtsResult => r !== null)
      .sort((a, b) => b.matchScore - a.matchScore);
  },
};
