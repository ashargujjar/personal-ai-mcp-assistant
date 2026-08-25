import type { NextFunction, Request, Response } from "express";
import { prisma } from "../db/connect";
import { AppError } from "./errorHandler";
import { verifyToken } from "../utils/jwt";
import { toSafeUser } from "../utils/user";

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
    if (!token) {
      throw new AppError("Authentication required", 401);
    }

    let payload;
    try {
      payload = verifyToken(token);
    } catch {
      throw new AppError("Invalid or expired token", 401);
    }

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      throw new AppError("User no longer exists", 401);
    }

    req.user = toSafeUser(user);
    next();
  } catch (err) {
    next(err);
  }
}
