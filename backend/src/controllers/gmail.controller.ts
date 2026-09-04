import type { NextFunction, Request, Response } from "express";
import { google } from "googleapis";
import jwt from "jsonwebtoken";
import { AppError } from "../middleware/errorHandler";
import type { SendMessageInput } from "@/schema/gmail.schema";
import { prisma } from "@/db/connect";
const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.modify",
];
const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-change-me";
const REDIRECT_URI =
  process.env.GMAIL_REDIRECT_URI ?? "http://localhost:4000/api/gmail/callback";
const FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:5173";
function buildOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    REDIRECT_URI,
  );
}
async function getGmailClientForUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.gmailRefreshToken) {
    throw new AppError("Gmail is not connected for this account", 400);
  }

  const client = buildOAuthClient();
  client.setCredentials({
    access_token: user.gmailAccessToken ?? undefined,
    refresh_token: user.gmailRefreshToken,
    expiry_date: user.gmailTokenExpiry?.getTime(),
  });

  client.on("tokens", async (tokens) => {
    await prisma.user.update({
      where: { id: userId },
      data: {
        gmailAccessToken: tokens.access_token ?? user.gmailAccessToken,
        gmailTokenExpiry: tokens.expiry_date
          ? new Date(tokens.expiry_date)
          : user.gmailTokenExpiry,
      },
    });
  });

  return google.gmail({ version: "v1", auth: client });
}

export async function gmailStatus(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) throw new AppError("Authentication required", 401);
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    res.json({ data: { connected: Boolean(user?.gmailRefreshToken) } });
  } catch (err) {
    next(err);
  }
}

export async function connectGmail(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) throw new AppError("Authentication required", 401);

    const state = jwt.sign({ userId: req.user.id }, JWT_SECRET, {
      expiresIn: "10m",
    });
    const client = buildOAuthClient();
    const url = client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: GMAIL_SCOPES,
      state,
    });

    res.json({ data: { url } });
  } catch (err) {
    next(err);
  }
}
export async function gmailCallback(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { code, state } = req.query;
    if (typeof code !== "string" || typeof state !== "string") {
      throw new AppError("Missing code or state", 400);
    }

    const { userId } = jwt.verify(state, JWT_SECRET) as { userId: string };

    const client = buildOAuthClient();
    const { tokens } = await client.getToken(code);

    if (!tokens.refresh_token) {
      throw new AppError(
        "Google did not return a refresh token — try disconnecting Gmail access in your Google account and reconnecting",
        400,
      );
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        gmailAccessToken: tokens.access_token,
        gmailRefreshToken: tokens.refresh_token,
        gmailTokenExpiry: tokens.expiry_date
          ? new Date(tokens.expiry_date)
          : null,
      },
    });

    res.redirect(`${FRONTEND_URL}/settings?gmail=connected`);
  } catch (err) {
    next(err);
  }
}

export async function disconnectGmail(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) throw new AppError("Authentication required", 401);
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });

    if (user?.gmailRefreshToken) {
      const client = buildOAuthClient();
      await client.revokeToken(user.gmailRefreshToken).catch(() => {
        // Token may already be invalid/expired on Google's side — proceed to clear it locally regardless.
      });
    }

    await prisma.user.update({
      where: { id: req.user.id },
      data: { gmailAccessToken: null, gmailRefreshToken: null, gmailTokenExpiry: null },
    });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function listMessages(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) throw new AppError("Authentication required", 401);
    const gmail = await getGmailClientForUser(req.user.id);

    const list = await gmail.users.messages.list({
      userId: "me",
      maxResults: 10,
    });
    const messages = await Promise.all(
      (list.data.messages ?? []).map(async (m) => {
        const detail = await gmail.users.messages.get({
          userId: "me",
          id: m.id!,
          format: "metadata",
          metadataHeaders: ["From", "Subject", "Date"],
        });
        const headers = detail.data.payload?.headers ?? [];
        const header = (name: string) =>
          headers.find((h) => h.name === name)?.value ?? "";

        return {
          id: detail.data.id,
          from: header("From"),
          subject: header("Subject"),
          date: header("Date"),
          snippet: detail.data.snippet,
        };
      }),
    );

    res.json({ data: messages });
  } catch (err) {
    next(err);
  }
}

export async function getMessage(
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) throw new AppError("Authentication required", 401);
    const gmail = await getGmailClientForUser(req.user.id);

    const detail = await gmail.users.messages.get({
      userId: "me",
      id: req.params.id,
      format: "full",
    });
    const headers = detail.data.payload?.headers ?? [];
    const header = (name: string) =>
      headers.find((h) => h.name === name)?.value ?? "";

    function extractBody(payload: typeof detail.data.payload): string {
      if (!payload) return "";
      if (payload.body?.data) {
        return Buffer.from(payload.body.data, "base64").toString("utf-8");
      }
      const textPart = payload.parts?.find((p) => p.mimeType === "text/plain");
      if (textPart?.body?.data) {
        return Buffer.from(textPart.body.data, "base64").toString("utf-8");
      }
      return "";
    }

    res.json({
      data: {
        id: detail.data.id,
        from: header("From"),
        to: header("To"),
        subject: header("Subject"),
        date: header("Date"),
        body: extractBody(detail.data.payload),
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function sendMessage(
  req: Request<unknown, unknown, SendMessageInput>,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) throw new AppError("Authentication required", 401);
    const gmail = await getGmailClientForUser(req.user.id);

    const { to, subject, body } = req.body;
    const raw = Buffer.from(
      `To: ${to}\r\nSubject: ${subject}\r\nContent-Type: text/plain; charset="UTF-8"\r\n\r\n${body}`,
    )
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    const result = await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw },
    });
    res.status(201).json({ data: { id: result.data.id } });
  } catch (err) {
    next(err);
  }
}

export async function deleteMessage(
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) throw new AppError("Authentication required", 401);
    const gmail = await getGmailClientForUser(req.user.id);

    await gmail.users.messages.trash({ userId: "me", id: req.params.id });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
