import type { NextFunction, Request, Response } from "express";
import { reportBackendError } from "../services/error-log-analyzer.service";

export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
  }
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const message = err instanceof Error ? err.message : "Internal server error";

  if (statusCode === 500) {
    console.error(err);
    reportBackendError(err, {
      source: "express:errorHandler",
      statusCode,
      request: req,
    });
  }

  res.status(statusCode).json({ message });
}
