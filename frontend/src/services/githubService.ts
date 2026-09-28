import { issues, pullRequests, repositories } from "@/mock/github";
import type {
  GitHubReviewHistoryItem,
  GitHubReviewResult,
  Issue,
  PullRequest,
  Repository,
} from "@/types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";

function authHeaders(token: string | null): HeadersInit {
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export const githubService = {
  async listRepos(): Promise<Repository[]> {
    return repositories;
  },

  async listPullRequests(repoId?: string): Promise<PullRequest[]> {
    return repoId ? pullRequests.filter((p) => p.repoId === repoId) : pullRequests;
  },

  async listIssues(repoId?: string): Promise<Issue[]> {
    return repoId ? issues.filter((i) => i.repoId === repoId) : issues;
  },

  async evaluateRepository(input: { repositoryUrl: string; token: string | null }): Promise<GitHubReviewResult> {
    const createResponse = await fetch(`${API_URL}/github/reviews`, {
      method: "POST",
      headers: authHeaders(input.token),
      body: JSON.stringify({ repositoryUrl: input.repositoryUrl }),
    });
    const createJson = await createResponse.json().catch(() => ({}));
    if (!createResponse.ok) {
      throw new Error(createJson?.message ?? "Could not verify this GitHub repository");
    }

    return githubService.getReviewFindings(createJson.data.reviewId, input.token);
  },

  async getReviewFindings(reviewId: string, token: string | null): Promise<GitHubReviewResult> {
    const response = await fetch(`${API_URL}/github/reviews/${encodeURIComponent(reviewId)}/findings`, {
      headers: authHeaders(token),
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(json?.message ?? "Could not load GitHub review findings");

    const review = json.data;
    return {
      reviewId: review.reviewId,
      repositoryUrl: review.repositoryUrl,
      repositoryName: review.repositoryName,
      branch: review.branch,
      status:
        review.status === "completed"
          ? "complete"
          : review.status === "failed"
            ? "failed"
            : "reviewing",
      evaluatedAt: review.evaluatedAt,
      overallScore: 0,
      riskLevel: "Low",
      summary: review.status === "completed" ? "Repository analysis completed." : "Repository analysis is in progress.",
      metrics: [],
      findings: review.findings,
      agentChecks: [],
      nextActions: [],
    };
  },

  async listReviews(token: string | null): Promise<GitHubReviewHistoryItem[]> {
    const response = await fetch(`${API_URL}/github/reviews`, {
      headers: authHeaders(token),
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(json?.message ?? "Could not load GitHub review history");
    return json.data as GitHubReviewHistoryItem[];
  },

  async deleteReview(reviewId: string, token: string | null): Promise<void> {
    const response = await fetch(`${API_URL}/github/reviews/${encodeURIComponent(reviewId)}`, {
      method: "DELETE",
      headers: authHeaders(token),
    });
    if (!response.ok) {
      const json = await response.json().catch(() => ({}));
      throw new Error(json?.message ?? "Could not delete GitHub review");
    }
  },
};
