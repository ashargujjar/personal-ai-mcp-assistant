import type { ID } from "./common";

export interface ResumeSubmission {
  id: ID;
  candidateName: string;
  candidateEmail: string;
  candidatePhone?: string;
  candidateAddress?: string;
  emailSubject: string;
  receivedAt: string;
  cloudinaryUrl: string | null;
  cloudinaryPublicId: string | null;
  jobTitle: string;
  description?: string;
}

export interface AtsResult {
  submissionId: ID;
  pdfName: string;
  matchScore: number;
  skills: string[];
  matchedSkills: string[];
  experienceYears?: number;
  experienceSummary: string;
  education?: string;
  strengths: string[];
  gaps: string[];
  projects: string[];
}

export interface ResumeSearch {
  id: ID;
  jobTitle: string;
  description?: string;
  dateFrom: string;
  dateTo: string;
  fetchedAt: string;
  submissions: ResumeSubmission[];
  results: AtsResult[];
  atsStatus: "not_started" | "queued" | "scanning" | "completed" | "failed";
  atsProcessed: number;
  atsTotal: number;
  status: "queued" | "searching" | "downloading" | "processing" | "ready" | "failed";
  error?: string;
}
