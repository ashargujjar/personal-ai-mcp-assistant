import { Job, Worker } from "bullmq";
import { redisConnection } from "../config/redis";
import { prisma } from "../db/connect";
import {
  PROCESS_RESUME_ATTACHMENT_JOB,
  RESUME_ATTACHMENT_QUEUE_NAME,
} from "../queues/resume-attachment.queue";
import type { ResumeAttachmentJob } from "../queues/resume.types";
import { downloadGmailAttachment } from "../services/gmail.service";
import { deletePdf, uploadResumePdf } from "../services/cloudinary";
import { extractAndStoreResumePdfText } from "../services/resume-pdf-text.service";

function resumePublicId(userId: string, searchId: string, applicantId: string) {
  return `resume-searches/${userId}/${searchId}/${applicantId}`;
}

async function markSearchCompleteIfDone(searchId: string) {
  const search = await prisma.resumeSearch.findUnique({
    where: { id: searchId },
    select: {
      id: true,
      total: true,
      processed: true,
      status: true,
    },
  });

  if (!search) return;

  if (
    search.total > 0 &&
    search.processed >= search.total &&
    search.status !== "COMPLETED"
  ) {
    await prisma.resumeSearch.update({
      where: { id: search.id },
      data: {
        status: "COMPLETED",
        finishedAt: new Date(),
      },
    });
  }
}

const worker = new Worker<ResumeAttachmentJob>(
  RESUME_ATTACHMENT_QUEUE_NAME,
  async (job: Job<ResumeAttachmentJob>) => {
    if (job.name !== PROCESS_RESUME_ATTACHMENT_JOB) {
      throw new Error(`Unsupported resume attachment job: ${job.name}`);
    }

    const { searchId, applicantId, userId, gmailMessageId, gmailAttachmentId } =
      job.data;

    const applicant = await prisma.resumeApplicant.findFirst({
      where: {
        id: applicantId,
        searchId,
        userId,
      },
    });

    if (!applicant) {
      return { applicantId, skipped: true };
    }

    if (applicant.status === "SAVED") {
      return { applicantId };
    }

    await prisma.resumeApplicant.update({
      where: { id: applicant.id },
      data: {
        status: "DOWNLOADING",
        errorMessage: null,
      },
    });

    const pdf = await downloadGmailAttachment(
      userId,
      gmailMessageId,
      gmailAttachmentId,
    );

    if (pdf.length < 5 || pdf.subarray(0, 5).toString() !== "%PDF-") {
      throw new Error("Attachment is not a valid PDF");
    }

    await extractAndStoreResumePdfText(
      pdf,
      applicant.originalFilename,
      applicant.id,
      userId,
    );

    await prisma.resumeApplicant.update({
      where: { id: applicant.id },
      data: {
        status: "UPLOADING",
        fileSize: pdf.length,
      },
    });

    const publicId = resumePublicId(userId, searchId, applicant.id);
    const uploaded = await uploadResumePdf(pdf, publicId);

    try {
      await prisma.$transaction([
        prisma.resumeApplicant.update({
          where: { id: applicant.id },
          data: {
            status: "SAVED",
            cloudinaryPublicId: uploaded.publicId,
            fileSize: pdf.length,
            errorMessage: null,
          },
        }),
        prisma.resumeSearch.update({
          where: { id: searchId },
          data: {
            processed: { increment: 1 },
            succeeded: { increment: 1 },
          },
        }),
      ]);
    } catch (error) {
      await deletePdf(uploaded.publicId).catch((cleanupError) => {
        console.error(
          `[resume-attachment-worker] orphan cleanup failed publicId=${uploaded.publicId}`,
          cleanupError,
        );
      });
      throw error;
    }

    await markSearchCompleteIfDone(searchId);

    console.log(`[resume-attachment-worker] saved applicant ${applicant.id}`);

    return { applicantId };
  },
  {
    connection: redisConnection,
    concurrency: 1,
  },
);

worker.on("failed", async (job, error) => {
  console.error(`[resume-attachment-worker] failed job ${job?.id}`, error);
  if (!job) return;

  if (job.attemptsMade < (job.opts.attempts ?? 1)) return;

  const { applicantId, searchId } = job.data;

  await prisma.$transaction([
    prisma.resumeApplicant.updateMany({
      where: {
        id: applicantId,
        status: {
          not: "SAVED",
        },
      },
      data: {
        status: "FAILED",
        errorMessage: error.message.slice(0, 1000),
      },
    }),
    prisma.resumeSearch.updateMany({
      where: { id: searchId },
      data: {
        processed: { increment: 1 },
        failed: { increment: 1 },
      },
    }),
  ]);

  await markSearchCompleteIfDone(searchId);
});

async function shutdown() {
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

console.log(
  `[resume-attachment-worker] listening queue=${RESUME_ATTACHMENT_QUEUE_NAME}`,
);
