import { issues, pullRequests, repositories } from "@/mock/github";
import { sleep } from "@/lib/utils";
import type { Issue, PullRequest, Repository } from "@/types";

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
};
