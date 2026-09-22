import type { NextFunction, Request, Response } from "express";
import type { Prisma } from "@prisma/client";
import { prisma } from "../db/connect";
import { AppError } from "../middleware/errorHandler";
import type {
  CreateResumeSearchInput,
  UpdateResumeSearchInput,
} from "../schema/resume.schema";
import { PROCESS_RESUME_SEARCH_JOB, resumeQueue } from "@/queues/resume.queue";
import { downloadUrl } from "../services/cloudinary";
import {
  PROCESS_RESUME_PDF_DELETION_JOB,
  resumePdfDeletionQueue,
} from "../queues/resume-pdf-deletion.queue";
import { extractResumeJobDetails } from "../services/resume-job-details.service";

function withFreshResumeUrls<T>(search: T) {
  const applicants = (search as { applicants?: { cloudinaryPublicId: string | null }[] })
    .applicants;

  return {
    ...search,
    applicants: applicants?.map((applicant) => ({
      ...applicant,
      cloudinaryUrl: applicant.cloudinaryPublicId
        ? downloadUrl(applicant.cloudinaryPublicId)
        : null,
    })),
  };
}

function dateRange(dateFrom: string, dateTo: string) {
  const from = new Date(`${dateFrom}T00:00:00.000Z`);
  const to = new Date(`${dateTo}T23:59:59.999Z`);

  if (from > to) {
    throw new AppError("dateFrom must be before or equal to dateTo", 400);
  }

  return { from, to };
}

export async function createResumeSearch(
  req: Request<unknown, unknown, CreateResumeSearchInput>,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) throw new AppError("Authentication required", 401);

    const { jobTitle, description, dateFrom, dateTo } = req.body;
    const { from, to } = dateRange(dateFrom, dateTo);

    const extractedJobDetails = await extractResumeJobDetails(
      jobTitle,
      description,
    );
    const { rawExtractedData, ...jobDetails } = extractedJobDetails;

    const search = await prisma.resumeSearch.create({
      data: {
        userId: req.user.id,
        jobTitle,
        description: description || null,
        dateFrom: from,
        dateTo: to,
        jobDetails: {
          create: {
            ...jobDetails,
            ...(rawExtractedData
              ? {
                  rawExtractedData:
                    rawExtractedData as Prisma.InputJsonObject,
                }
              : {}),
          },
        },
      },
      include: { applicants: true, jobDetails: true },
    });
    try {
      await resumeQueue.add(
        PROCESS_RESUME_SEARCH_JOB,
        {
          searchId: search.id,
          userId: req.user.id,
        },
        {
          jobId: search.id,
        },
      );
    } catch (error) {
      await prisma.resumeSearch.delete({ where: { id: search.id } });
      throw error;
    }

    res.status(201).json({ data: withFreshResumeUrls(search) });
  } catch (err) {
    next(err);
  }
}

export async function listResumeSearches(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) throw new AppError("Authentication required", 401);

    const searches = await prisma.resumeSearch.findMany({
      where: { userId: req.user.id },
      include: { applicants: true, jobDetails: true },
      orderBy: { createdAt: "desc" },
    });

    res.json({ data: searches.map(withFreshResumeUrls) });
  } catch (err) {
    next(err);
  }
}

export async function getResumeSearch(
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) throw new AppError("Authentication required", 401);

    const search = await prisma.resumeSearch.findFirst({
      where: { id: req.params.id, userId: req.user.id },
      include: {
        jobDetails: true,
        applicants: {
          orderBy: { receivedAt: "desc" },
        },
      },
    });

    if (!search) throw new AppError("Resume search not found", 404);
    res.json({ data: withFreshResumeUrls(search) });
  } catch (err) {
    next(err);
  }
}

export async function updateResumeSearch(
  req: Request<{ id: string }, unknown, UpdateResumeSearchInput>,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) throw new AppError("Authentication required", 401);

    const existing = await prisma.resumeSearch.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });

    if (!existing) throw new AppError("Resume search not found", 404);
    if (existing.status !== "QUEUED") {
      throw new AppError("Only queued resume searches can be edited", 409);
    }

    const { jobTitle, description, dateFrom, dateTo } = req.body;
    const nextDateFrom =
      dateFrom ?? existing.dateFrom.toISOString().slice(0, 10);
    const nextDateTo = dateTo ?? existing.dateTo.toISOString().slice(0, 10);
    const range =
      dateFrom || dateTo ? dateRange(nextDateFrom, nextDateTo) : undefined;

    const search = await prisma.resumeSearch.update({
      where: { id: existing.id },
      data: {
        jobTitle,
        description,
        ...(range
          ? {
              dateFrom: range.from,
              dateTo: range.to,
            }
          : {}),
      },
      include: { applicants: true, jobDetails: true },
    });

    res.json({ data: withFreshResumeUrls(search) });
  } catch (err) {
    next(err);
  }
}

export async function deleteResumeSearch(
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) throw new AppError("Authentication required", 401);

    const existing = await prisma.resumeSearch.findFirst({
      where: { id: req.params.id, userId: req.user.id },
      include: {
        applicants: {
          select: {
            id: true,
            cloudinaryPublicId: true,
          },
        },
      },
    });

    if (!existing) throw new AppError("Resume search not found", 404);

    await prisma.resumeSearch.delete({ where: { id: existing.id } });

    const deletionJobs = existing.applicants
      .filter((applicant) => applicant.cloudinaryPublicId)
      .map((applicant) => ({
        name: PROCESS_RESUME_PDF_DELETION_JOB,
        data: {
          searchId: existing.id,
          applicantId: applicant.id,
          userId: req.user!.id,
          publicId: applicant.cloudinaryPublicId!,
        },
        opts: {
          jobId: `resume-pdf-deletion-${applicant.id}`,
        },
      }));

    if (deletionJobs.length > 0) {
      await resumePdfDeletionQueue.addBulk(deletionJobs);
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
