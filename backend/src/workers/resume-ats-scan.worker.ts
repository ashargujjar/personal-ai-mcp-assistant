import { Job, Worker } from "bullmq";
import { redisConnection } from "../config/redis";
import {
  PROCESS_RESUME_ATS_SCAN_JOB,
  RESUME_ATS_SCAN_QUEUE_NAME,
} from "../queues/resume-ats-scan.queue";
import type { ResumeAtsScanJob } from "../queues/resume.types";

const worker = new Worker<ResumeAtsScanJob>(
  RESUME_ATS_SCAN_QUEUE_NAME,
  async (job: Job<ResumeAtsScanJob>) => {
    if (job.name !== PROCESS_RESUME_ATS_SCAN_JOB) {
      throw new Error(`Unsupported resume ATS scan job: ${job.name}`);
    }

    const { searchId, applicantId } = job.data;

    console.log(
      `[resume-ats-scan-worker] received search=${searchId} applicant=${applicantId}`,
    );

    return { applicantId };
  },
  {
    connection: redisConnection,
    concurrency: 1,
  },
);

worker.on("failed", (job, error) => {
  console.error(`[resume-ats-scan-worker] failed job ${job?.id}`, error);
});

async function shutdown() {
  await worker.close();
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

console.log(`[resume-ats-scan-worker] listening queue=${RESUME_ATS_SCAN_QUEUE_NAME}`);
