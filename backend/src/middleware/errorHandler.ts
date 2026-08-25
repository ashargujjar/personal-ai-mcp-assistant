import type { NextFunction, Request, Response } from "express";

export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
  }
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const message = err instanceof Error ? err.message : "Internal server error";

  if (statusCode === 500) {
    console.error(err);
  }

  res.status(statusCode).json({ message });
}
