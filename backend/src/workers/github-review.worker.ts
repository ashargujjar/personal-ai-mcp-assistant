import { Job, Worker } from "bullmq";
import { redisConnection } from "../config/redis";
import {
  GITHUB_REVIEW_QUEUE_NAME,
  PROCESS_GITHUB_REVIEW_JOB,
} from "../queues/github.queue";
import type { GitHubRepositoryReviewJob } from "../queues/github.types";

const worker = new Worker<GitHubRepositoryReviewJob>(
  GITHUB_REVIEW_QUEUE_NAME,
  async (job: Job<GitHubRepositoryReviewJob>) => {
    if (job.name !== PROCESS_GITHUB_REVIEW_JOB) {
      throw new Error(`Unsupported GitHub job: ${job.name}`);
    }

    // Review logic will be added here later.
    console.log(
      `[github-review-worker] received repository=${job.data.owner}/${job.data.repository}`,
    );

    return {
      repositoryId: job.data.repositoryId,
      status: "queued-for-review",
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
