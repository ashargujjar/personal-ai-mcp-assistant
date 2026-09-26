import { Queue } from "bullmq";
import { redisConnection } from "../config/redis";
import type { GitHubRepositoryReviewJob } from "./github.types";

export const GITHUB_REVIEW_QUEUE_NAME = "github-reviews";
export const PROCESS_GITHUB_REVIEW_JOB = "process-github-review";

export const githubReviewQueue = new Queue<GitHubRepositoryReviewJob>(
  GITHUB_REVIEW_QUEUE_NAME,
  {
    connection: redisConnection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5000,
      },
      removeOnComplete: {
        age: 24 * 60 * 60,
        count: 1000,
      },
      removeOnFail: {
        age: 7 * 24 * 60 * 60,
        count: 5000,
      },
    },
  },
);
