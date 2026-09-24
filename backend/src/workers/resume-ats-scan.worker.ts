import { Job, Worker } from "bullmq";
import type { Prisma } from "@prisma/client";
import { redisConnection } from "../config/redis";
import { prisma } from "../db/connect";
import {
  PROCESS_RESUME_ATS_SCAN_JOB,
  RESUME_ATS_SCAN_QUEUE_NAME,
} from "../queues/resume-ats-scan.queue";
import type { ResumeAtsScanJob } from "../queues/resume.types";
import { extractAndStoreResumePdfTextFromCloudinary } from "../services/resume-pdf-text.service";
import {
  getStoredResumeJobDetails,
  getStoredResumeText,
  scoreResumeAgainstJob,
} from "../services/resume-ats-scan.service";

async function markAtsScanCompleteIfDone(searchId: string) {
  const search = await prisma.resumeSearch.findUnique({
    where: { id: searchId },
    select: {
      id: true,
      atsTotal: true,
      atsProcessed: true,
      atsFailed: true,
      atsStatus: true,
    },
  });

  if (!search || search.atsTotal <= 0 || search.atsProcessed < search.atsTotal) {
    return;
  }

  await prisma.resumeSearch.update({
    where: { id: search.id },
    data: {
      atsStatus: search.atsFailed > 0 ? "FAILED" : "COMPLETED",
      atsFinishedAt: new Date(),
    },
  });
}

const worker = new Worker<ResumeAtsScanJob>(
  RESUME_ATS_SCAN_QUEUE_NAME,
  async (job: Job<ResumeAtsScanJob>) => {
    if (job.name !== PROCESS_RESUME_ATS_SCAN_JOB) {
      throw new Error(`Unsupported resume ATS scan job: ${job.name}`);
    }

    const { searchId, applicantId } = job.data;

    await prisma.resumeSearch.updateMany({
      where: {
        id: searchId,
        atsStatus: {
          in: ["QUEUED", "SCANNING"],
        },
      },
      data: {
        atsStatus: "SCANNING",
        atsStartedAt: new Date(),
        atsErrorMessage: null,
      },
    });

    const search = await prisma.resumeSearch.findUnique({
      where: { id: searchId },
      select: {
        id: true,
        userId: true,
        jobTitle: true,
      },
    });

    if (!search || search.userId !== job.data.userId) {
      throw new Error("Resume search not found for ATS scan job");
    }

    const jobDetails = await getStoredResumeJobDetails(
      search.id,
      job.data.userId,
    );

    const applicant = await prisma.resumeApplicant.findFirst({
      where: {
        id: applicantId,
        searchId: search.id,
        userId: job.data.userId,
      },
      select: {
        id: true,
        originalFilename: true,
        candidateName: true,
        cloudinaryPublicId: true,
      },
    });

    if (!applicant) {
      throw new Error("Resume applicant not found for ATS scan job");
    }

    let resumeText: string;
    try {
      resumeText = await getStoredResumeText(
        search.id,
        applicant.id,
        job.data.userId,
      );
    } catch (error) {
      const canUseCloudinaryFallback =
        error instanceof Error &&
        error.message === "Stored resume PDF text is unavailable" &&
        applicant.cloudinaryPublicId;
      if (!canUseCloudinaryFallback) throw error;

      const extraction = await extractAndStoreResumePdfTextFromCloudinary(
        applicant.cloudinaryPublicId,
        applicant.originalFilename,
        applicant.id,
        job.data.userId,
      );
      resumeText = extraction.fullText.trim();
    }

    if (!resumeText) {
      throw new Error("Resume PDF text is unavailable for ATS scan");
    }

    const atsScore = await scoreResumeAgainstJob(jobDetails, resumeText);
    const { comparison, resumeData, comparisonInput } = atsScore;

    await prisma.$transaction([
      prisma.resumeAtsResult.upsert({
        where: { applicantId: applicant.id },
        update: {
          userId: job.data.userId,
          searchId: search.id,
          matchScore: comparison.matchScore,
          skills: resumeData.skills,
          matchedSkills: comparison.matchedSkills,
          experienceYears: resumeData.experienceYears ?? null,
          experienceSummary:
            comparison.experienceSummary ||
            resumeData.experienceSummary ||
            null,
          education: comparison.education ?? resumeData.education ?? null,
          strengths: comparison.strengths,
          gaps: comparison.gaps,
          rawModelOutput: {
            resumeData,
            comparisonInput,
            comparison,
          } as unknown as Prisma.InputJsonObject,
        },
        create: {
          userId: job.data.userId,
          searchId: search.id,
          applicantId: applicant.id,
          matchScore: comparison.matchScore,
          skills: resumeData.skills,
          matchedSkills: comparison.matchedSkills,
          experienceYears: resumeData.experienceYears ?? null,
          experienceSummary:
            comparison.experienceSummary ||
            resumeData.experienceSummary ||
            null,
          education: comparison.education ?? resumeData.education ?? null,
          strengths: comparison.strengths,
          gaps: comparison.gaps,
          rawModelOutput: {
            resumeData,
            comparisonInput,
            comparison,
          } as unknown as Prisma.InputJsonObject,
        },
      }),
      prisma.resumeSearch.update({
        where: { id: search.id },
        data: {
          atsProcessed: { increment: 1 },
          atsSucceeded: { increment: 1 },
        },
      }),
    ]);

    await markAtsScanCompleteIfDone(search.id);

    console.log(
      `[resume-ats-scan-worker] received search=${searchId} applicant=${applicantId}`,
    );

    return {
      applicantId,
      filename: applicant.originalFilename,
      candidateName: applicant.candidateName,
      resumeTextLength: resumeText.length,
      jobTitle: search.jobTitle,
      matchScore: comparison.matchScore,
    };
  },
  {
    connection: redisConnection,
    concurrency: 1,
  },
);

worker.on("failed", async (job, error) => {
  console.error(`[resume-ats-scan-worker] failed job ${job?.id}`, error);
  if (!job || job.attemptsMade < (job.opts.attempts ?? 1)) return;

  const { searchId } = job.data;

  await prisma.resumeSearch.updateMany({
    where: {
      id: searchId,
      atsStatus: {
        in: ["QUEUED", "SCANNING"],
      },
    },
    data: {
      atsProcessed: { increment: 1 },
      atsFailed: { increment: 1 },
      atsStatus: "FAILED",
      atsErrorMessage: error.message.slice(0, 1000),
      atsFinishedAt: new Date(),
    },
  });

  await markAtsScanCompleteIfDone(searchId);
});

async function shutdown() {
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

console.log(`[resume-ats-scan-worker] listening queue=${RESUME_ATS_SCAN_QUEUE_NAME}`);
