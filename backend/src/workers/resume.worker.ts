import { Job, Worker } from "bullmq";
import { redisConnection } from "../config/redis";
import { prisma } from "../db/connect";
import { PROCESS_RESUME_SEARCH_JOB, RESUME_QUEUE_NAME } from "../queues/resume.queue";
import type { ResumeSearchJob } from "../queues/resume.types";

const worker = new Worker<ResumeSearchJob>(
  RESUME_QUEUE_NAME,
  async (job: Job<ResumeSearchJob>) => {
    if (job.name !== PROCESS_RESUME_SEARCH_JOB) {
      throw new Error(`Unsupported resume job: ${job.name}`);
    }

    const { searchId, userId } = job.data;

    const search = await prisma.resumeSearch.findFirst({
      where: {
        id: searchId,
        userId,
      },
    });

    if (!search) {
      throw new Error("Resume search not found");
    }

    await prisma.resumeSearch.update({
      where: { id: search.id },
      data: {
        status: "SEARCHING_GMAIL",
        startedAt: search.startedAt ?? new Date(),
        errorMessage: null,
      },
    });

    console.log(`[resume-worker] started search ${search.id}`);

    return { searchId: search.id };
  },
  {
    connection: redisConnection,
    concurrency: 1,
  },
);

worker.on("completed", (job) => {
  console.log(`[resume-worker] completed job ${job.id}`);
});

worker.on("failed", async (job, error) => {
  console.error(`[resume-worker] failed job ${job?.id}`, error);
  if (!job) return;

  const { searchId } = job.data;

  await prisma.resumeSearch.updateMany({
    where: {
      id: searchId,
      status: {
        not: "COMPLETED",
      },
    },
    data: {
      status: "FAILED",
      errorMessage: error.message.slice(0, 1000),
      finishedAt: new Date(),
    },
  });
});

async function shutdown() {
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

console.log(`[resume-worker] listening queue=${RESUME_QUEUE_NAME}`);
