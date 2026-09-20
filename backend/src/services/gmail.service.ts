import { google, type gmail_v1 } from "googleapis";
import { prisma } from "../db/connect";
import { AppError } from "../middleware/errorHandler";

const REDIRECT_URI =
  process.env.GMAIL_REDIRECT_URI ?? "http://localhost:4000/api/gmail/callback";

function buildOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    REDIRECT_URI,
  );
}

export async function getGmailClientForUser(userId: string) {
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

export function messageHeader(message: gmail_v1.Schema$Message, name: string) {
  return (
    message.payload?.headers?.find(
      (header) => header.name?.toLowerCase() === name.toLowerCase(),
    )?.value ?? ""
  );
}

function decodeBase64Url(value: string) {
  return Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
}

export function extractPlainTextBody(message: gmail_v1.Schema$Message): string {
  const parts = message.payload?.parts ?? [];
  const plainPart = parts.find((part) => part.mimeType === "text/plain" && part.body?.data);
  if (plainPart?.body?.data) return decodeBase64Url(plainPart.body.data);
  if (message.payload?.body?.data) return decodeBase64Url(message.payload.body.data);
  return "";
}

export interface PdfAttachment {
  attachmentId: string;
  filename: string;
  mimeType: string;
  size: number;
}

export function extractPdfAttachments(message: gmail_v1.Schema$Message): PdfAttachment[] {
  const attachments: PdfAttachment[] = [];

  function visit(part: gmail_v1.Schema$MessagePart) {
    const filename = part.filename?.trim() ?? "";
    const isPdf = part.mimeType === "application/pdf" || filename.toLowerCase().endsWith(".pdf");
    if (isPdf && part.body?.attachmentId && filename) {
      attachments.push({
        attachmentId: part.body.attachmentId,
        filename,
        mimeType: part.mimeType ?? "application/pdf",
        size: Number(part.body.size ?? 0),
      });
    }
    for (const child of part.parts ?? []) visit(child);
  }

  if (message.payload) visit(message.payload);
  return attachments;
}

export function buildResumeGmailQuery(dateFrom: Date, dateTo: Date, jobTitle: string) {
  const exclusiveEnd = new Date(dateTo);
  exclusiveEnd.setUTCDate(exclusiveEnd.getUTCDate() + 1);
  const terms = jobTitle
    .replaceAll('"', "")
    .split(/\s+/)
    .map((term) => term.trim())
    .filter(Boolean);
  const query = [
    "has:attachment",
    "filename:pdf",
    `after:${dateFrom.toISOString().slice(0, 10).replaceAll("-", "/")}`,
    `before:${exclusiveEnd.toISOString().slice(0, 10).replaceAll("-", "/")}`,
  ];
  if (terms.length > 0) query.push(`subject:(${terms.join(" ")})`);
  return query.join(" ");
}
