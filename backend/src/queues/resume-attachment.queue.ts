import { Queue } from "bullmq";
import { redisConnection } from "../config/redis";
import type { ResumeAttachmentJob } from "./resume.types";

export const RESUME_ATTACHMENT_QUEUE_NAME = "resume-attachments";
export const PROCESS_RESUME_ATTACHMENT_JOB = "process-resume-attachment";

export const resumeAttachmentQueue = new Queue<ResumeAttachmentJob>(
  RESUME_ATTACHMENT_QUEUE_NAME,
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
