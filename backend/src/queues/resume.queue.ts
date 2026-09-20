import { Queue } from "bullmq";
import { redisConnection } from "../config/redis";
import type { ResumeSearchJob } from "./resume.types";

export const RESUME_QUEUE_NAME = "resume-searches";
export const PROCESS_RESUME_SEARCH_JOB = "process-resume-search";

export const resumeQueue = new Queue<ResumeSearchJob>(RESUME_QUEUE_NAME, {
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
});
