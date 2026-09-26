import { Job, Worker } from "bullmq";
import { redisConnection } from "../config/redis";
import {
  GITHUB_REVIEW_QUEUE_NAME,
  PROCESS_GITHUB_REVIEW_JOB,
} from "../queues/github.queue";
import type { GitHubRepositoryReviewJob } from "../queues/github.types";
import { createGitHubWorkspace } from "../services/github-workspace.service";
import {
  cloneGitHubRepository,
  getClonedRepositoryCommitSha,
} from "../services/github-clone.service";
import { prisma } from "../db/connect";
import { cleanupRepositoryForScan } from "../services/github-repository-cleanup.service";

const worker = new Worker<GitHubRepositoryReviewJob>(
  GITHUB_REVIEW_QUEUE_NAME,
  async (job: Job<GitHubRepositoryReviewJob>) => {
    if (job.name !== PROCESS_GITHUB_REVIEW_JOB) {
      throw new Error(`Unsupported GitHub job: ${job.name}`);
    }

    const workspacePath = await createGitHubWorkspace(job.data.reviewId);
    await cloneGitHubRepository(job.data.repositoryUrl, workspacePath);
    const commitSha = await getClonedRepositoryCommitSha(workspacePath);
    const cleanupSummary = await cleanupRepositoryForScan(workspacePath);

    await prisma.githubReview.update({
      where: { id: job.data.reviewId },
      data: {
        status: "PROCESSING",
        commitSha,
      },
    });

    console.log(
      `[github-review-worker] clone succeeded repository=${job.data.owner}/${job.data.repository} commit=${commitSha} workspace=${workspacePath} removed_dirs=${cleanupSummary.removedDirectories} removed_files=${cleanupSummary.removedFiles}`,
    );

    return {
      repositoryId: job.data.repositoryId,
      workspacePath,
      cloneStatus: "success",
      commitSha,
      cleanupSummary,
    };
  },
  {
    connection: redisConnection,
    concurrency: 1,
  },
);

worker.on("completed", (job) => {
  console.log(`[github-review-worker] completed job ${job.id}`);
});

worker.on("failed", (job, error) => {
  console.error(`[github-review-worker] failed job ${job?.id}`, error);
});

async function shutdown() {
  await worker.close();
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

console.log(`[github-review-worker] listening queue=${GITHUB_REVIEW_QUEUE_NAME}`);
