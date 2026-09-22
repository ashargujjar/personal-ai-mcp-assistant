import type { NextFunction, Request, Response } from "express";
import { prisma } from "../db/connect";
import { AppError } from "../middleware/errorHandler";

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
          },
        },
      },
    });

    if (!search) throw new AppError("Resume search not found", 404);

    if (search.status !== "COMPLETED") {
      throw new AppError("Job search is in progress. Please wait a while.", 409);
    }

    const pendingApplicants = search.applicants.filter(
      (applicant) =>
        applicant.status !== "SAVED" || !applicant.cloudinaryPublicId,
    );

    if (pendingApplicants.length > 0) {
      throw new AppError("Job search is in progress. Please wait a while.", 409);
    }

    res.json({
      data: {
        queued: 0,
        message: "ATS scan is ready to be queued.",
      },
    });
  } catch (err) {
    next(err);
  }
}
