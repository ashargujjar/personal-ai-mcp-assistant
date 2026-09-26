import type { ID } from "./common";

export interface Repository {
  id: ID;
  name: string;
  description: string;
  isPrivate: boolean;
  stars: number;
  openIssues: number;
  openPRs: number;
  language: string;
  updatedAt: string;
}

export type PullRequestState = "open" | "merged" | "closed";

export interface PullRequest {
  id: ID;
  repoId: ID;
  number: number;
  title: string;
  state: PullRequestState;
  author: string;
  createdAt: string;
}

export type IssueState = "open" | "closed";

export interface Issue {
  id: ID;
  repoId: ID;
  number: number;
  title: string;
  state: IssueState;
  author: string;
  createdAt: string;
  labels: string[];
}

export type GitHubReviewSeverity = "critical" | "high" | "medium" | "low";

export type GitHubReviewCategory = "Security" | "Bugs" | "Quality" | "Testing" | "Dependencies";

export interface GitHubReviewFinding {
  id: ID;
  category: GitHubReviewCategory;
  severity: GitHubReviewSeverity;
  title: string;
  summary: string;
  location: string;
  recommendation: string;
}

export interface GitHubReviewMetric {
  label: string;
  value: string | number;
  detail: string;
  score: number;
}

export interface GitHubReviewResult {
  reviewId?: string;
  repositoryUrl: string;
  repositoryName: string;
  branch: string;
  status: "ready" | "reviewing" | "complete";
  evaluatedAt: string;
  overallScore: number;
  riskLevel: "Low" | "Medium" | "High" | "Critical";
  summary: string;
  metrics: GitHubReviewMetric[];
  findings: GitHubReviewFinding[];
  agentChecks: string[];
  nextActions: string[];
}
