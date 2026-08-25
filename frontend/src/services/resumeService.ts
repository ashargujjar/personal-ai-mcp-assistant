import { atsResultsBySubmissionId, resumeSubmissions } from "@/mock/resumes";
import { sleep } from "@/lib/utils";
import type { AtsResult, ResumeSubmission } from "@/types";

export const resumeService = {
  async fetchFromGmail(input: { dateFrom: string; dateTo: string; jobTitle: string; description?: string }): Promise<ResumeSubmission[]> {
    await sleep(700);
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
