import type { NextFunction, Request, Response } from "express";
import { prisma } from "../db/connect";
import { AppError } from "../middleware/errorHandler";
import {
  PROCESS_RESUME_ATS_SCAN_JOB,
  resumeAtsScanQueue,
} from "../queues/resume-ats-scan.queue";

function hasExtractedText(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;

  const fullText = (value as { fullText?: unknown }).fullText;
  return typeof fullText === "string" && fullText.trim().length > 0;
}

export async function runResumeAtsScan(
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) throw new AppError("Authentication required", 401);

    const search = await prisma.resumeSearch.findFirst({
      where: { id: req.params.id, userId: req.user.id },
      include: {
        applicants: {
          select: {
            id: true,
            status: true,
            cloudinaryPublicId: true,
            pdfTextExtraction: true,
          },
        },
      },
    });

    if (!search) throw new AppError("Resume search not found", 404);

    if (search.status !== "COMPLETED") {
      throw new AppError("Job search is in progress. Please wait a while.", 409);
    }

    if (search.atsStatus === "QUEUED" || search.atsStatus === "SCANNING") {
      throw new AppError("ATS scan is already in progress.", 409);
    }

    const applicantsWithoutText = search.applicants.filter(
      (applicant) =>
        applicant.status === "SAVED" &&
        applicant.cloudinaryPublicId &&
        !hasExtractedText(applicant.pdfTextExtraction),
    );

    if (applicantsWithoutText.length > 0) {
      throw new AppError(
        "Some saved resumes do not have extracted PDF text yet. Please wait for PDF processing to finish.",
        409,
      );
    }

    const applicants = search.applicants.filter(
      (applicant) =>
        applicant.status === "SAVED" &&
        Boolean(applicant.cloudinaryPublicId) &&
        hasExtractedText(applicant.pdfTextExtraction),
    );

    if (applicants.length === 0) {
      throw new AppError("No saved resumes are available for ATS scanning.", 409);
    }

    await prisma.resumeSearch.update({
      where: { id: search.id },
      data: {
        atsStatus: "QUEUED",
        atsTotal: applicants.length,
        atsProcessed: 0,
        atsSucceeded: 0,
        atsFailed: 0,
        atsErrorMessage: null,
        atsStartedAt: new Date(),
        atsFinishedAt: null,
      },
    });

    try {
      await resumeAtsScanQueue.addBulk(
        applicants.map((applicant) => ({
          name: PROCESS_RESUME_ATS_SCAN_JOB,
          data: {
            searchId: search.id,
            applicantId: applicant.id,
            userId: req.user!.id,
          },
          opts: {
            jobId: `resume-ats-${search.id}-${applicant.id}`,
          },
        })),
      );
    } catch (error) {
      await prisma.resumeSearch.update({
        where: { id: search.id },
        data: {
          atsStatus: "FAILED",
          atsErrorMessage:
            error instanceof Error
              ? error.message.slice(0, 1000)
              : "Failed to queue ATS scan jobs.",
          atsFinishedAt: new Date(),
        },
      });
      throw error;
    }

    res.status(202).json({
      data: {
        queued: applicants.length,
        atsStatus: "QUEUED",
        message: "ATS scan has been queued.",
      },
    });
  } catch (err) {
    next(err);
  }
}
