import { Queue } from "bullmq";
import { redisConnection } from "../config/redis";
import type { ResumePdfDeletionJob } from "./resume.types";

export const RESUME_PDF_DELETION_QUEUE_NAME = "resume-pdf-deletions";
export const PROCESS_RESUME_PDF_DELETION_JOB = "process-resume-pdf-deletion";

export const resumePdfDeletionQueue = new Queue<ResumePdfDeletionJob>(
  RESUME_PDF_DELETION_QUEUE_NAME,
  {
    connection: redisConnection,
    defaultJobOptions: {
      attempts: 8,
      backoff: {
        type: "exponential",
        delay: 30000,
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
