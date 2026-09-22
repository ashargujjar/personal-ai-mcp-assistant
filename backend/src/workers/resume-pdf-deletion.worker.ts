import { Job, Worker } from "bullmq";
import { redisConnection } from "../config/redis";
import {
  PROCESS_RESUME_PDF_DELETION_JOB,
  RESUME_PDF_DELETION_QUEUE_NAME,
} from "../queues/resume-pdf-deletion.queue";
import type { ResumePdfDeletionJob } from "../queues/resume.types";
import { deletePdf } from "../services/cloudinary";

const worker = new Worker<ResumePdfDeletionJob>(
  RESUME_PDF_DELETION_QUEUE_NAME,
  async (job: Job<ResumePdfDeletionJob>) => {
    if (job.name !== PROCESS_RESUME_PDF_DELETION_JOB) {
      throw new Error(`Unsupported resume PDF deletion job: ${job.name}`);
    }

    const { publicId, searchId, applicantId } = job.data;

    await deletePdf(publicId);

    console.log(
      `[resume-pdf-deletion-worker] deleted search=${searchId} applicant=${applicantId}`,
    );

    return { publicId };
  },
  {
    connection: redisConnection,
    concurrency: 2,
  },
);

worker.on("failed", (job, error) => {
  console.error(`[resume-pdf-deletion-worker] failed job ${job?.id}`, error);
});

async function shutdown() {
  await worker.close();
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

console.log(
  `[resume-pdf-deletion-worker] listening queue=${RESUME_PDF_DELETION_QUEUE_NAME}`,
);
