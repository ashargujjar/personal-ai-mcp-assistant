import { Job, Worker } from "bullmq";
import { redisConnection } from "../config/redis";
import { prisma } from "../db/connect";
import {
  PROCESS_RESUME_SEARCH_JOB,
  RESUME_QUEUE_NAME,
} from "../queues/resume.queue";
import type {
  ResumeAttachmentJob,
  ResumeSearchJob,
} from "../queues/resume.types";
import {
  buildResumeGmailQuery,
  extractPdfAttachments,
  extractPlainTextBody,
  getGmailClientForUser,
  messageHeader,
} from "../services/gmail.service";
import {
  PROCESS_RESUME_ATTACHMENT_JOB,
  resumeAttachmentQueue,
} from "../queues/resume-attachment.queue";
function parseSender(value: string) {
  const match = value.match(/^(?:"?([^"<]*)"?\s*)?<([^>]+)>$/);
  if (match) {
    return {
      name: match[1]?.trim() || null,
      email: match[2].trim(),
    };
  }
  return {
    name: null,
    email: value.trim(),
  };
}

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

    const gmail = await getGmailClientForUser(userId);
    const query = buildResumeGmailQuery(
      search.dateFrom,
      search.dateTo,
      search.jobTitle,
    );
    const attachmentJobs: ResumeAttachmentJob[] = [];
    let pageToken: string | undefined;
    do {
      const page = await gmail.users.messages.list({
        userId: "me",
        q: query,
        maxResults: 100,
        pageToken,
      });

      for (const messageRef of page.data.messages ?? []) {
        if (!messageRef.id) continue;

        const message = await gmail.users.messages.get({
          userId: "me",
          id: messageRef.id,
          format: "full",
        });
        const sender = parseSender(messageHeader(message.data, "From"));
        const attachments = extractPdfAttachments(message.data);
        if (attachments.length === 0) continue;

        const receivedAtValue = messageHeader(message.data, "Date");
        const receivedAt = new Date(receivedAtValue);
        if (Number.isNaN(receivedAt.getTime())) {
          throw new Error(`Invalid Gmail date for message ${messageRef.id}`);
        }

        for (const attachment of attachments) {
          const applicant = await prisma.resumeApplicant.upsert({
            where: {
              searchId_gmailMessageId_gmailAttachmentId: {
                searchId: search.id,
                gmailMessageId: messageRef.id,
                gmailAttachmentId: attachment.attachmentId,
              },
            },
            create: {
              searchId: search.id,
              userId,
              gmailMessageId: messageRef.id,
              gmailAttachmentId: attachment.attachmentId,
              gmailThreadId: message.data.threadId ?? "",
              emailFrom: messageHeader(message.data, "From"),
              emailTo: messageHeader(message.data, "To"),
              emailBody: extractPlainTextBody(message.data),
              emailSnippet: message.data.snippet ?? "",
              gmailLabelIds: message.data.labelIds ?? [],
              candidateName: sender.name,
              candidateEmail: sender.email || null,
              emailSubject: messageHeader(message.data, "Subject"),
              receivedAt,
              originalFilename: attachment.filename,
              mimeType: attachment.mimeType,
              fileSize: attachment.size || null,
              status: "DISCOVERED",
            },
            update: {},
          });
          attachmentJobs.push({
            searchId: search.id,
            applicantId: applicant.id,
            userId,
            gmailMessageId: messageRef.id,
            gmailAttachmentId: attachment.attachmentId,
          });
        }
      }

      pageToken = page.data.nextPageToken ?? undefined;
    } while (pageToken);

    const applicantCount = await prisma.resumeApplicant.count({
      where: { searchId: search.id },
    });

    if (applicantCount === 0) {
      await prisma.resumeSearch.update({
        where: { id: search.id },
        data: {
          status: "COMPLETED",
          total: 0,
          processed: 0,
          succeeded: 0,
          failed: 0,
          finishedAt: new Date(),
        },
      });

      console.log(`[resume-worker] completed empty search=${search.id}`);
      return { searchId: search.id };
    }

    await prisma.resumeSearch.update({
      where: { id: search.id },
      data: {
        status: "PROCESSING",
        total: applicantCount,
      },
    });

    for (const attachmentJob of attachmentJobs) {
      await resumeAttachmentQueue.add(
        PROCESS_RESUME_ATTACHMENT_JOB,
        attachmentJob,
        {
          jobId: attachmentJob.applicantId,
        },
      );
    }

    console.log(
      `[resume-worker] discovered search=${search.id} applicants=${applicantCount}`,
    );

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
  if (job.attemptsMade < (job.opts.attempts ?? 1)) return;

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
