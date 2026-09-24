import type { ResumeSearch, ResumeSubmission } from "@/types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";

type BackendSearchStatus = "QUEUED" | "SEARCHING_GMAIL" | "PROCESSING" | "COMPLETED" | "FAILED";
type BackendAtsStatus = "NOT_STARTED" | "QUEUED" | "SCANNING" | "COMPLETED" | "FAILED";
type FrontendSearchStatus = ResumeSearch["status"];

interface BackendApplicant {
  id: string;
  originalFilename: string;
  candidateName: string | null;
  candidateEmail: string | null;
  candidatePhone: string | null;
  candidateAddress: string | null;
  emailSubject: string;
  receivedAt: string;
  cloudinaryPublicId: string | null;
  cloudinaryUrl?: string | null;
}

interface BackendAtsResult {
  applicantId: string;
  matchScore: number;
  skills: unknown;
  matchedSkills: unknown;
  experienceYears: number | null;
  experienceSummary: string | null;
  education: string | null;
  strengths: unknown;
  gaps: unknown;
  rawModelOutput: unknown;
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
  atsResults?: BackendAtsResult[];
  atsStatus: BackendAtsStatus;
  atsProcessed: number;
  atsTotal: number;
}

interface RunAtsScanResponse {
  queued: number;
  message: string;
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

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
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
    atsStatus: search.atsStatus.toLowerCase() as ResumeSearch["atsStatus"],
    atsProcessed: search.atsProcessed,
    atsTotal: search.atsTotal,
    submissions: search.applicants.map((applicant): ResumeSubmission => ({
      id: applicant.id,
      candidateName: applicant.candidateName ?? "Unknown candidate",
      candidateEmail: applicant.candidateEmail ?? "",
      candidatePhone: applicant.candidatePhone ?? undefined,
      candidateAddress: applicant.candidateAddress ?? undefined,
      emailSubject: applicant.emailSubject,
      receivedAt: applicant.receivedAt,
      cloudinaryPublicId: applicant.cloudinaryPublicId,
      cloudinaryUrl: applicant.cloudinaryUrl ?? null,
      jobTitle: search.jobTitle,
      description,
    })),
    results: (search.atsResults ?? []).map((result) => {
      const applicant = search.applicants.find(
        (item) => item.id === result.applicantId,
      );
      const raw =
        result.rawModelOutput &&
        typeof result.rawModelOutput === "object" &&
        !Array.isArray(result.rawModelOutput)
          ? (result.rawModelOutput as { resumeData?: { projects?: unknown } })
          : undefined;

      return {
        submissionId: result.applicantId,
        pdfName: applicant?.originalFilename ?? "Resume PDF",
        matchScore: result.matchScore,
        skills: stringArray(result.skills),
        matchedSkills: stringArray(result.matchedSkills),
        experienceYears: result.experienceYears ?? undefined,
        experienceSummary: result.experienceSummary ?? "",
        education: result.education ?? undefined,
        strengths: stringArray(result.strengths),
        gaps: stringArray(result.gaps),
        projects: stringArray(raw?.resumeData?.projects),
      };
    }),
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

  async runAtsScan(token: string | null, id: string): Promise<RunAtsScanResponse> {
    const res = await fetch(`${API_URL}/resume-searches/${encodeURIComponent(id)}/ats-scan`, {
      method: "POST",
      headers: authHeaders(token),
    });
    return parseResponse<RunAtsScanResponse>(res, "Failed to start ATS scan");
  },
};
