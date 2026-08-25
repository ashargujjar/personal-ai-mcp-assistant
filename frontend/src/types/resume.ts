import type { ID } from "./common";

export interface ResumeSubmission {
  id: ID;
  candidateName: string;
  candidateEmail: string;
  emailSubject: string;
  receivedAt: string;
  pdfLink: string;
  jobTitle: string;
  description?: string;
}

export interface AtsResult {
  submissionId: ID;
  matchScore: number;
  skills: string[];
  matchedSkills: string[];
  experienceYears: number;
  experienceSummary: string;
  education?: string;
  strengths: string[];
  gaps: string[];
}
