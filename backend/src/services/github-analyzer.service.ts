import type { RepositoryCodeChunk } from "./github-analyzer-preparation.service";

const analyzerUrl = process.env.GITHUB_ANALYZER_URL ?? "http://python:8000";

interface AnalyzeGitHubRepositoryInput {
  reviewId: string;
  repositoryId: number;
  repositoryUrl: string;
  owner: string;
  repository: string;
  commitSha: string;
  chunks: RepositoryCodeChunk[];
}

export async function sendGitHubRepositoryToAnalyzer(
  input: AnalyzeGitHubRepositoryInput,
) {
  const response = await fetch(`${analyzerUrl}/github/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body?.message ?? "GitHub analyzer request failed");
  }

  return body.data;
}
