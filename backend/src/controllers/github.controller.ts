import type { NextFunction, Request, Response } from "express";
import { AppError } from "../middleware/errorHandler";
import type { ReviewRepositoryInput } from "../schema/github.schema";
import {
  githubReviewQueue,
  PROCESS_GITHUB_REVIEW_JOB,
} from "../queues/github.queue";

interface GitHubRepositoryResponse {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  private: boolean;
  visibility?: string;
  default_branch: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  open_issues_count: number;
  updated_at: string;
}

function repositoryApiUrl(repositoryUrl: string): { owner: string; repository: string; apiUrl: string } {
  const url = new URL(repositoryUrl);
  const [owner, rawRepository] = url.pathname.split("/").filter(Boolean);
  const repository = rawRepository.replace(/\.git$/, "");

  return {
    owner,
    repository,
    apiUrl: `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}`,
  };
}

export async function reviewRepository(
  req: Request<unknown, unknown, ReviewRepositoryInput>,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) throw new AppError("Authentication required", 401);

    const { owner, repository, apiUrl } = repositoryApiUrl(req.body.repositoryUrl);
    const githubResponse = await fetch(apiUrl, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "Nexus-AI-GitHub-Reviewer",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (githubResponse.status === 404) {
      throw new AppError("Repository not found. It may not exist or may be private.", 404);
    }
    if (githubResponse.status === 403) {
      throw new AppError("GitHub rejected the repository check. The public API rate limit may have been exceeded.", 503);
    }
    if (!githubResponse.ok) {
      throw new AppError("Could not verify this GitHub repository right now.", 502);
    }

    const repositoryData = (await githubResponse.json()) as GitHubRepositoryResponse;
    if (repositoryData.private || repositoryData.visibility === "private") {
      throw new AppError("Private repositories are not supported. Please provide a public GitHub repository.", 403);
    }

    const job = await githubReviewQueue.add(PROCESS_GITHUB_REVIEW_JOB, {
      userId: req.user.id,
      repositoryUrl: repositoryData.html_url,
      owner,
      repository,
      repositoryId: repositoryData.id,
    });

    res.status(200).json({
      data: {
        valid: true,
        public: true,
        owner,
        repository,
        repositoryUrl: repositoryData.html_url,
        id: repositoryData.id,
        name: repositoryData.name,
        fullName: repositoryData.full_name,
        description: repositoryData.description,
        defaultBranch: repositoryData.default_branch,
        language: repositoryData.language,
        stars: repositoryData.stargazers_count,
        openIssues: repositoryData.open_issues_count,
        updatedAt: repositoryData.updated_at,
        reviewStatus: "queued",
        reviewJobId: job.id,
      },
    });
  } catch (error) {
    next(error);
  }
}
