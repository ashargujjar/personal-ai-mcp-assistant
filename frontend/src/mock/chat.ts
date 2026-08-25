import type { QuickAction, SourceCitation, ToolExecution } from "@/types";

export const quickActions: QuickAction[] = [
  { id: "qa-1", label: "Summarize my emails", prompt: "Summarize my emails", icon: "Mail" },
  { id: "qa-2", label: "What should I focus on today?", prompt: "What should I focus on today?", icon: "Target" },
  { id: "qa-3", label: "Prepare me for today's meetings", prompt: "Prepare me for today's meetings", icon: "Users" },
  { id: "qa-4", label: "Search my documents", prompt: "Search my documents for LangGraph checkpointing", icon: "FileSearch" },
  { id: "qa-5", label: "Find my GitHub issues", prompt: "Find my GitHub issues related to authentication", icon: "Github" },
  { id: "qa-6", label: "Create a task", prompt: "Create a task to review the auth PR before Friday", icon: "ListPlus" },
  { id: "qa-7", label: "Remember something", prompt: "Remember that I prefer concise, direct code review comments", icon: "BrainCircuit" },
];

export interface CannedResponse {
  toolExecutions: Omit<ToolExecution, "id" | "status" | "durationMs">[];
  content: string;
  sources?: SourceCitation[];
}

const authIssuesResponse: CannedResponse = {
  toolExecutions: [
    { label: "Searching GitHub", toolName: "GitHub.search_issues" },
    { label: "Searching personal memory", toolName: "Memory.retrieve" },
    { label: "Reading project documentation", toolName: "Knowledge.search" },
    { label: "Analyzing results", toolName: "Analysis.synthesize" },
  ],
  content:
    "I found 3 relevant GitHub issues related to authentication.\n\n1. **JWT refresh token failure** — under concurrent rotation, the refresh flow can race and issue conflicting tokens. Fix is in review (PR #201).\n2. **OAuth callback error** — malformed `state` param causes an unhandled exception instead of a 400 response.\n3. **Session expiration bug** — silent logout occurs when the tab regains focus after the token has expired.\n\nThe most urgent is #142 since the fix is already in review and blocking today's rollout deadline.",
  sources: [
    { id: "src-1", type: "github", title: "auth-service", subtitle: "Repository" },
    { id: "src-2", type: "github", title: "Issue #142 — JWT refresh token failure", subtitle: "vectorworks-io/auth-service" },
    { id: "src-3", type: "github", title: "Issue #156 — OAuth callback error", subtitle: "vectorworks-io/mcp-tool-server" },
  ],
};

const documentSearchResponse: CannedResponse = {
  toolExecutions: [
    { label: "Searching knowledge base", toolName: "Knowledge.search" },
    { label: "Ranking passages", toolName: "Knowledge.rerank" },
  ],
  content:
    "LangGraph checkpointing persists the full graph state after each super-step, keyed by `thread_id`. It's what enables resuming interrupted runs, human-in-the-loop approval gates, and time-travel debugging by replaying from a prior checkpoint.\n\nThe default checkpointer is in-memory — for production, LangGraph recommends a Postgres or SQLite saver so state survives process restarts.",
  sources: [
    { id: "src-4", type: "document", title: "LangGraph Documentation.pdf", subtitle: "Page 42" },
    { id: "src-5", type: "document", title: "My AI Notes.md", subtitle: "Page 8" },
  ],
};

const focusTodayResponse: CannedResponse = {
  toolExecutions: [
    { label: "Checking calendar", toolName: "Calendar.list_events" },
    { label: "Checking important emails", toolName: "Gmail.search_emails" },
    { label: "Checking GitHub activity", toolName: "GitHub.search_pull_requests" },
    { label: "Checking tasks", toolName: "Tasks.list" },
    { label: "Retrieving relevant memories", toolName: "Memory.retrieve" },
  ],
  content:
    "Here's what I'd prioritize today:\n\n1. **Review PR #201** (auth-service) — the refresh token race-condition fix is blocking the Friday rollout Maria is waiting on.\n2. **Reply to Maria's email** — she needs timeline confirmation before end of day.\n3. **Prep for the 4pm Q3 roadmap planning** — bring the cost-per-session benchmark if you have it ready.\n\nYou have 4 meetings today and 2 tasks with deadlines before 6pm, so I'd knock out the PR review first — it unblocks both the client reply and today's most time-sensitive commitment.",
};

const meetingPrepResponse: CannedResponse = {
  toolExecutions: [
    { label: "Checking calendar", toolName: "Calendar.list_events" },
    { label: "Retrieving meeting history", toolName: "Meetings.search" },
    { label: "Searching related documents", toolName: "Knowledge.search" },
    { label: "Checking related GitHub activity", toolName: "GitHub.search_pull_requests" },
  ],
  content:
    "You have 4 meetings today:\n\n**9:00 AM — Team Standup**\nQuick sync, no prep needed.\n\n**11:30 AM — Bright Client Project Sync**\nMaria will likely ask about the refresh token rollout timeline. PR #201 is in review — mention it should merge before the call.\n\n**2:00 PM — Distributed Systems Office Hours**\nBring your thesis outline draft if you have questions on failure recovery framing.\n\n**4:00 PM — Q3 Roadmap Planning**\nCome with the cost-per-session number — Sam's draft roadmap references it directly.",
};

const analyzeWeekResponse: CannedResponse = {
  toolExecutions: [
    { label: "Checking task activity", toolName: "Tasks.list" },
    { label: "Checking GitHub activity", toolName: "GitHub.search_pull_requests" },
    { label: "Checking email volume", toolName: "Gmail.search_emails" },
    { label: "Compiling weekly analytics", toolName: "Analytics.summarize" },
  ],
  content:
    "This week: **7 tasks completed**, **4 PRs merged or in review** across your repos, and **31 emails processed** (18% marked important). Your busiest day was Thursday with 3 meetings back to back.\n\nOne pattern worth flagging: 3 of your last 5 completed tasks came from GitHub issues rather than planned work — might be worth blocking focus time for the RAG chunking experiments, which have been sitting untouched since Tuesday.",
};

const emailSummaryResponse: CannedResponse = {
  toolExecutions: [
    { label: "Fetching inbox", toolName: "Gmail.list_inbox" },
    { label: "Classifying importance", toolName: "Gmail.classify" },
    { label: "Extracting action items", toolName: "Analysis.extract_tasks" },
  ],
  content:
    "You have **12 unread emails**, 3 flagged important:\n\n1. **Maria Alvarez** — needs timeline confirmation on the refresh token rollout by EOD.\n2. **Daniel Cho** — left review comments on PR #201, mostly nits, one concurrency concern.\n3. **Priya Nair** — blocked on embeddings service 503s (already resolved as of yesterday).\n\nEverything else is lower priority: a GitHub notification, lecture slides from Prof. Mehta, and a couple of newsletters.",
};

const createTaskResponse: CannedResponse = {
  toolExecutions: [
    { label: "Parsing task details", toolName: "Analysis.extract_task" },
    { label: "Creating task", toolName: "Tasks.create" },
  ],
  content:
    "Done — I've created a task:\n\n**Review the auth PR before Friday**\nPriority: High · Project: auth-service · Deadline: Friday, Aug 22\n\nIt's now in your Today view under Tasks.",
};

const rememberResponse: CannedResponse = {
  toolExecutions: [{ label: "Storing memory", toolName: "Memory.store" }],
  content:
    "Got it — I'll remember that you prefer concise, direct code review comments. I'll factor this in when drafting review feedback or PR summaries on your behalf.",
};

const defaultResponse: CannedResponse = {
  toolExecutions: [
    { label: "Searching personal memory", toolName: "Memory.retrieve" },
    { label: "Analyzing request", toolName: "Analysis.synthesize" },
  ],
  content:
    "Here's what I found. This is a mocked response from the frontend demo — once connected to the real Nexus AI backend, this will be generated live using your connected tools and data sources.",
};

export function getCannedResponse(prompt: string): CannedResponse {
  const p = prompt.toLowerCase();
  if (p.includes("github") || p.includes("issue")) return authIssuesResponse;
  if (p.includes("focus")) return focusTodayResponse;
  if (p.includes("meeting")) return meetingPrepResponse;
  if (p.includes("week")) return analyzeWeekResponse;
  if (p.includes("email")) return emailSummaryResponse;
  if (p.includes("document") || p.includes("checkpoint")) return documentSearchResponse;
  if (p.includes("create a task") || p.includes("create task")) return createTaskResponse;
  if (p.includes("remember")) return rememberResponse;
  return defaultResponse;
}
