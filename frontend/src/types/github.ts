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
