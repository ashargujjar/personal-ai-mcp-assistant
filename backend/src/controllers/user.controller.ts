import { Readable } from "node:stream";
import type { NextFunction, Request, Response } from "express";
import { AppError } from "../middleware/errorHandler";

export async function chatAssistant(req: Request, res: Response, next: NextFunction) {
  try {
    const { chatText, threadId, resume, timezone } = req.body;
    if (!chatText && !resume) {
      throw new AppError("chatText or resume is required", 400);
    }
    if (!threadId) {
      throw new AppError("threadId is required", 400);
    }

    const aiUrl = process.env.PYTHON_URL;
    if (!aiUrl) {
      throw new AppError("PYTHON_URL is not configured", 500);
    }

    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      throw new AppError("Authentication required", 401);
    }

    const aiRes = await fetch(`${aiUrl}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ stream: true, message: chatText, threadId, resume, timezone }),
    });

    if (!aiRes.ok || !aiRes.body) {
      const errorText = await aiRes.text();
      throw new AppError(errorText || "Assistant service error", aiRes.status || 502);
    }

    res.status(200);
    res.setHeader("Content-Type", aiRes.headers.get("content-type") ?? "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // aiRes.body is a stream/web ReadableStream (undici's fetch); Readable.fromWeb
    // expects node:stream/web's type, which isn't structurally identical, hence the cast.
    Readable.fromWeb(aiRes.body as import("node:stream/web").ReadableStream).pipe(res);
  } catch (err) {
    next(err);
  }
}
