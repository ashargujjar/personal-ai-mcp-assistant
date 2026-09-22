import { Queue } from "bullmq";
import { redisConnection } from "../config/redis";
import type { ResumeAtsScanJob } from "./resume.types";

export const RESUME_ATS_SCAN_QUEUE_NAME = "resume-ats-scans";
export const PROCESS_RESUME_ATS_SCAN_JOB = "process-resume-ats-scan";

export const resumeAtsScanQueue = new Queue<ResumeAtsScanJob>(
  RESUME_ATS_SCAN_QUEUE_NAME,
  {
    connection: redisConnection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 10000,
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
