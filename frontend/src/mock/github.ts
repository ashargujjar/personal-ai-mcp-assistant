import type { Issue, PullRequest, Repository } from "@/types";

export const repositories: Repository[] = [
  { id: "repo-1", name: "vectorworks-io/auth-service", description: "Authentication and session management service.", isPrivate: true, stars: 24, openIssues: 5, openPRs: 2, language: "TypeScript", updatedAt: "2026-08-22T08:05:00Z" },
  { id: "repo-2", name: "vectorworks-io/mcp-tool-server", description: "MCP server exposing internal tools to the assistant.", isPrivate: true, stars: 41, openIssues: 3, openPRs: 1, language: "Python", updatedAt: "2026-08-22T06:15:00Z" },
  { id: "repo-3", name: "ashar/nexus-ai-frontend", description: "Personal AI operating system — frontend.", isPrivate: false, stars: 12, openIssues: 1, openPRs: 0, language: "TypeScript", updatedAt: "2026-08-21T19:00:00Z" },
];

export const pullRequests: PullRequest[] = [
  { id: "pr-1", repoId: "repo-1", number: 201, title: "Fix JWT refresh token race condition", state: "open", author: "ashar", createdAt: "2026-08-21T10:00:00Z" },
  { id: "pr-2", repoId: "repo-1", number: 198, title: "Add rate limiting to login endpoint", state: "merged", author: "daniel-cho", createdAt: "2026-08-17T14:00:00Z" },
  { id: "pr-3", repoId: "repo-2", number: 89, title: "Add GitHub tool: search_pull_requests", state: "open", author: "ashar", createdAt: "2026-08-20T09:00:00Z" },
];

export const issues: Issue[] = [
  { id: "issue-1", repoId: "repo-1", number: 142, title: "JWT refresh token failure under concurrent rotation", state: "open", author: "priya-nair", createdAt: "2026-08-19T08:00:00Z", labels: ["bug", "priority:high"] },
  { id: "issue-2", repoId: "repo-2", number: 156, title: "OAuth callback error on malformed state param", state: "open", author: "lena-fischer", createdAt: "2026-08-22T06:15:00Z", labels: ["bug"] },
  { id: "issue-3", repoId: "repo-1", number: 137, title: "Session expiration bug on tab refocus", state: "open", author: "ashar", createdAt: "2026-08-16T12:00:00Z", labels: ["bug", "needs-repro"] },
  { id: "issue-4", repoId: "repo-3", number: 12, title: "Command palette doesn't close on route change", state: "closed", author: "ashar", createdAt: "2026-08-10T10:00:00Z", labels: ["bug"] },
];
