import type { NextFunction, Request, Response } from "express";
import { createHash, randomUUID } from "node:crypto";
import { prisma } from "../db/connect";
import { AppError } from "../middleware/errorHandler";
import { documentMetadataSchema } from "../schema/document.schema";
import { deletePdf, downloadUrl, uploadPdf } from "../services/cloudinary";
import type { Document, DocumentVersion, IngestionStatus } from "@prisma/client";

const latestVersion = {
  versions: {
    orderBy: { versionNumber: "desc" as const }, take: 1,
    include: {
      ingestionJobs: {
        orderBy: [{ createdAt: "desc" as const }, { id: "desc" as const }], take: 1,
        select: { id: true, status: true },
      },
    },
  },
};

// Keep the existing frontend response shape while reading file fields from versions.
// Latest uploaded version is for file management, not a retrieval publication rule.
function documentResponse(document: Document & {
  versions: (DocumentVersion & { ingestionJobs: { id: string; status: IngestionStatus }[] })[];
}) {
  const { versions, ...identity } = document;
  const version = versions[0];
  if (!version) throw new AppError("Document has no file version", 409);
  return {
    ...identity,
    documentVersionId: version.id,
    versionNumber: version.versionNumber,
    filename: version.filename,
    originalFilename: version.originalFilename,
    storageKey: version.storageKey,
    mimeType: version.mimeType,
    fileSize: version.fileSize,
    fileHash: version.fileHash,
    ingestionJobId: version.ingestionJobs[0]?.id ?? null,
    ingestionStatus: version.ingestionJobs[0]?.status ?? null,
  };
}

// Personal tenants are derived from authenticated identity, never client input.
export async function listDocuments(req: Request, res: Response, next: NextFunction) {
  try {
    const documents = await prisma.document.findMany({
      where: { userId: req.user!.id, tenantId: req.user!.id },
      orderBy: { createdAt: "desc" },
      include: latestVersion,
    });
    res.json({ data: documents.map(documentResponse) });
  } catch (e) { next(e); }
}

export async function uploadDocument(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = documentMetadataSchema.safeParse(req.query);
    if (!parsed.success) throw new AppError("Provide a PDF filename and valid document metadata", 400);
    if (!req.is("application/pdf") || !Buffer.isBuffer(req.body) || req.body.length < 5 || req.body.subarray(0, 5).toString() !== "%PDF-") throw new AppError("A PDF file is required", 415);
    const { filename: originalFilename, ...details } = parsed.data;
    const filename = `${randomUUID()}.pdf`;
    const storageKey = `documents/${req.user!.id}/${filename}`;
    await uploadPdf(req.body, storageKey);
    try {
      // One nested write commits document, source version, job, and outbox event.
      const document = await prisma.document.create({
        data: {
          ...details,
          tenantId: req.user!.id,
          userId: req.user!.id,
          versions: {
            create: {
              versionNumber: 1,
              filename,
              originalFilename,
              storageKey,
              mimeType: "application/pdf",
              fileSize: req.body.length,
              fileHash: createHash("sha256").update(req.body).digest("hex"),
              ingestionJobs: {
                create: {
                  pipelineVersion: "source-access-v1",
                  outboxEvents: { create: {} },
                },
              },
            },
          },
        },
        include: latestVersion,
      });
      res.status(201).json({ data: documentResponse(document) });
    } catch (e) {
      await deletePdf(storageKey).catch((cleanupError) => console.error("Orphan document requires cleanup", storageKey, cleanupError));
      throw e;
    }
  } catch (e) { next(e); }
}

export async function downloadDocument(req: Request, res: Response, next: NextFunction) {
  try {
    const doc = await prisma.document.findFirst({
      where: { id: req.params.id, userId: req.user!.id, tenantId: req.user!.id },
      include: latestVersion,
    });
    if (!doc) throw new AppError("Document not found", 404);
    res.setHeader("Cache-Control", "no-store");
    const version = doc.versions[0];
    if (!version) throw new AppError("Document has no file version", 409);
    res.json({ data: { url: downloadUrl(version.storageKey) } });
  } catch (e) { next(e); }
}

export async function deleteDocument(req: Request, res: Response, next: NextFunction) {
  try {
    const where = { id: req.params.id, userId: req.user!.id, tenantId: req.user!.id };
    const doc = await prisma.document.findFirst({ where, include: { versions: true } });
    if (!doc) throw new AppError("Document not found", 404);
    // Storage deletion is retryable; keep DB references if a storage call fails.
    for (const version of doc.versions) await deletePdf(version.storageKey);
    await prisma.$transaction(async (tx) => {
      await tx.documentVersion.deleteMany({ where: { documentId: doc.id, document: where } });
      await tx.document.deleteMany({ where });
    });
    res.sendStatus(204);
  } catch (e) { next(e); }
}

export function handleDocumentUploadError(err: unknown, _req: Request, res: Response, next: NextFunction) {
  if ((err as { type?: string })?.type === "entity.too.large") { res.status(413).json({ message: "PDF files must be 20 MB or smaller" }); return; }
  next(err);
}
