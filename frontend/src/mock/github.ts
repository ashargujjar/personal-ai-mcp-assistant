import type { GitHubReviewResult, Issue, PullRequest, Repository } from "@/types";

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

export const repositoryReview: GitHubReviewResult = {
  repositoryUrl: "https://github.com/ashar/nexus-ai-frontend",
  repositoryName: "ashar/nexus-ai-frontend",
  branch: "main",
  status: "complete",
  evaluatedAt: "2026-09-26T09:30:00Z",
  overallScore: 82,
  riskLevel: "Medium",
  summary:
    "The repository is structured well enough for agent evaluation, with clear frontend boundaries and reusable components. The main risks are dependency freshness, missing defensive tests around authenticated flows, and a few quality issues that can become bugs as the product grows.",
  metrics: [
    { label: "Security", value: "B", detail: "No obvious secrets in source; auth edge cases need deeper validation.", score: 78 },
    { label: "Bug Risk", value: "Medium", detail: "Async state and route transitions need targeted regression coverage.", score: 72 },
    { label: "Code Quality", value: "Good", detail: "Consistent component patterns with a few duplicated service assumptions.", score: 86 },
    { label: "Test Coverage", value: "Partial", detail: "Core UI paths exist, but agent workflows need mocked API tests.", score: 64 },
  ],
  findings: [
    {
      id: "finding-1",
      category: "Security",
      severity: "high",
      title: "Authenticated GitHub review should validate repository ownership server-side",
      summary: "The frontend can collect any GitHub URL, so the backend agent must confirm access rights before cloning or reading repository metadata.",
      location: "future backend /api/github/reviews",
      recommendation: "Require authenticated GitHub identity, normalize owner/repo input, and reject private repositories without explicit installation access.",
    },
    {
      id: "finding-2",
      category: "Bugs",
      severity: "medium",
      title: "Review status needs resilient loading and retry states",
      summary: "Agent scans will be long-running, so users need progress, failure recovery, and stale-result indicators.",
      location: "frontend/src/pages/GitHub.tsx",
      recommendation: "Use a review job id, poll review state, and preserve the last complete result while a new scan runs.",
    },
    {
      id: "finding-3",
      category: "Quality",
      severity: "medium",
      title: "Evaluation output should be normalized by category",
      summary: "Security, bug, quality, test, and dependency findings should use a shared schema so dashboards and exports stay consistent.",
      location: "frontend/src/types/github.ts",
      recommendation: "Keep severity, category, location, evidence, and recommendation fields stable across backend responses.",
    },
    {
      id: "finding-4",
      category: "Testing",
      severity: "low",
      title: "Add UI tests for URL submission and result rendering",
      summary: "The review console depends on typed results and empty/loading states that should be protected before the backend lands.",
      location: "frontend/src/pages/GitHub.tsx",
      recommendation: "Mock review responses and test valid URL submission, invalid URL messaging, and categorized finding display.",
    },
  ],
  agentChecks: [
    "Repository metadata and default branch",
    "Dependency manifest and known advisory scan",
    "Authentication and authorization surfaces",
    "Input validation, error handling, and async state",
    "Code quality, duplication, maintainability, and test gaps",
  ],
  nextActions: [
    "Create the backend review job endpoint",
    "Connect GitHub App installation permissions",
    "Store review snapshots for comparison over time",
    "Add exportable report summaries for security and quality reviews",
  ],
};
