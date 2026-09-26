import { issues, pullRequests, repositories } from "@/mock/github";
import { sleep } from "@/lib/utils";
import type { GitHubReviewResult, Issue, PullRequest, Repository } from "@/types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";

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
    const response = await fetch(`${API_URL}/github/reviews`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(input.token ? { Authorization: `Bearer ${input.token}` } : {}),
      },
      body: JSON.stringify({ repositoryUrl: input.repositoryUrl }),
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(json?.message ?? "Could not verify this GitHub repository");

    const queued = json.data as { reviewId: string };

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
      reviewId: queued.reviewId,
    };
  },
};
