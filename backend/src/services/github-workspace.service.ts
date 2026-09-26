import { mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const githubWorkspaceRoot =
  process.env.GITHUB_WORKSPACE_DIR ??
  path.join(os.tmpdir(), "nexus-ai", "github-reviews");

export async function createGitHubWorkspace(reviewId: string): Promise<string> {
  await mkdir(githubWorkspaceRoot, { recursive: true });

  const workspacePath = path.join(githubWorkspaceRoot, reviewId);
  await mkdir(workspacePath, { recursive: true });

  return workspacePath;
}

export function getGitHubWorkspaceRoot(): string {
  return githubWorkspaceRoot;
}
