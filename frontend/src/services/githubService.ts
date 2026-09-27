import { issues, pullRequests, repositories } from "@/mock/github";
import { sleep } from "@/lib/utils";
import type { GitHubReviewResult, Issue, PullRequest, Repository } from "@/types";

export const githubService = {
  async listRepos(): Promise<Repository[]> {
    await sleep(200);
    return repositories;
  },

  async listPullRequests(repoId?: string): Promise<PullRequest[]> {
    await sleep(180);
    return repoId ? pullRequests.filter((p) => p.repoId === repoId) : pullRequests;
  },

  async listIssues(repoId?: string): Promise<Issue[]> {
    await sleep(180);
    return repoId ? issues.filter((i) => i.repoId === repoId) : issues;
  },

  async evaluateRepository(input: { repositoryUrl: string; token: string | null }): Promise<GitHubReviewResult> {
    await sleep(600);

    return {
      repositoryUrl: input.repositoryUrl,
      repositoryName: input.repositoryUrl.replace(/^https?:\/\/(www\.)?github\.com\//i, "").replace(/\.git$/, ""),
      branch: "main",
      status: "reviewing",
      evaluatedAt: new Date().toISOString(),
      overallScore: 0,
      riskLevel: "Low",
      summary: "Repository verified. Findings will be added by the backend review worker.",
      metrics: [],
      findings: [],
      agentChecks: [],
      nextActions: [],
      reviewId: "preview-review",
    };
  },
};
