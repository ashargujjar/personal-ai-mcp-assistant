import type { AtsResult, ResumeSearch, ResumeSubmission } from "@/types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";

type BackendSearchStatus = "QUEUED" | "SEARCHING_GMAIL" | "PROCESSING" | "COMPLETED" | "FAILED";
type FrontendSearchStatus = ResumeSearch["status"];

interface BackendApplicant {
  id: string;
  candidateName: string | null;
  candidateEmail: string | null;
  emailSubject: string;
  receivedAt: string;
  cloudinaryPublicId: string | null;
  cloudinaryUrl?: string | null;
}

interface BackendResumeSearch {
  id: string;
  jobTitle: string;
  description: string | null;
  dateFrom: string;
  dateTo: string;
  status: BackendSearchStatus;
  errorMessage: string | null;
  createdAt: string;
  applicants: BackendApplicant[];
}

function authHeaders(token: string | null): HeadersInit {
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function parseResponse<T>(res: Response, fallbackMessage: string): Promise<T> {
  if (!res.ok) {
    const json = await res.json().catch(() => null);
    throw new Error(json?.message ?? fallbackMessage);
  }
  if (res.status === 204) return undefined as T;
  const json = await res.json();
  return json.data as T;
}

function mapStatus(status: BackendSearchStatus): FrontendSearchStatus {
  if (status === "QUEUED") return "queued";
  if (status === "SEARCHING_GMAIL") return "searching";
  if (status === "PROCESSING") return "processing";
  if (status === "FAILED") return "failed";
  return "ready";
}

function toDateInput(value: string) {
  return value.slice(0, 10);
}

function mapSearch(search: BackendResumeSearch): ResumeSearch {
  const description = search.description ?? undefined;
  return {
    id: search.id,
    jobTitle: search.jobTitle,
    description,
    dateFrom: toDateInput(search.dateFrom),
    dateTo: toDateInput(search.dateTo),
    fetchedAt: search.createdAt,
    status: mapStatus(search.status),
    error: search.errorMessage ?? undefined,
    submissions: search.applicants.map((applicant): ResumeSubmission => ({
      id: applicant.id,
      candidateName: applicant.candidateName ?? "Unknown candidate",
      candidateEmail: applicant.candidateEmail ?? "",
      emailSubject: applicant.emailSubject,
      receivedAt: applicant.receivedAt,
      cloudinaryPublicId: applicant.cloudinaryPublicId,
      cloudinaryUrl: applicant.cloudinaryUrl ?? null,
      jobTitle: search.jobTitle,
      description,
    })),
    results: [],
  };
}

export const resumeService = {
  async list(token: string | null): Promise<ResumeSearch[]> {
    const res = await fetch(`${API_URL}/resume-searches`, { headers: authHeaders(token) });
    const searches = await parseResponse<BackendResumeSearch[]>(res, "Failed to load resume searches");
    return searches.map(mapSearch);
  },

  async get(token: string | null, id: string): Promise<ResumeSearch> {
    const res = await fetch(`${API_URL}/resume-searches/${encodeURIComponent(id)}`, { headers: authHeaders(token) });
    return mapSearch(await parseResponse<BackendResumeSearch>(res, "Failed to load resume search"));
  },

  async create(
    token: string | null,
    input: { dateFrom: string; dateTo: string; jobTitle: string; description?: string },
  ): Promise<ResumeSearch> {
    const res = await fetch(`${API_URL}/resume-searches`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify(input),
    });
    return mapSearch(await parseResponse<BackendResumeSearch>(res, "Failed to create resume search"));
  },

  async remove(token: string | null, id: string): Promise<void> {
    const res = await fetch(`${API_URL}/resume-searches/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: authHeaders(token),
    });
    await parseResponse<void>(res, "Failed to delete resume search");
  },

  async runAtsScan(_submissions: ResumeSubmission[]): Promise<AtsResult[]> {
    return [];
  },
};
