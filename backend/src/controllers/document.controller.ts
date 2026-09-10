import type { NextFunction, Request, Response } from "express";
import { createHash, randomUUID } from "node:crypto";
import { prisma } from "../db/connect";
import { AppError } from "../middleware/errorHandler";
import { documentMetadataSchema } from "../schema/document.schema";
import { deletePdf, downloadUrl, uploadPdf } from "../services/cloudinary";

// Personal tenants are derived from authenticated identity, never client input.
export async function listDocuments(req: Request, res: Response, next: NextFunction) {
  try { res.json({ data: await prisma.document.findMany({ where: { userId: req.user!.id, tenantId: req.user!.id }, orderBy: { createdAt: "desc" } }) }); } catch (e) { next(e); }
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
      const document = await prisma.document.create({ data: { ...details, tenantId: req.user!.id, userId: req.user!.id, filename, originalFilename, storageKey, mimeType: "application/pdf", fileSize: req.body.length, fileHash: createHash("sha256").update(req.body).digest("hex") } });
      res.status(201).json({ data: document });
    } catch (e) {
      await deletePdf(storageKey).catch((cleanupError) => console.error("Orphan document requires cleanup", storageKey, cleanupError));
      throw e;
    }
  } catch (e) { next(e); }
}

export async function downloadDocument(req: Request, res: Response, next: NextFunction) {
  try {
    const doc = await prisma.document.findFirst({ where: { id: req.params.id, userId: req.user!.id, tenantId: req.user!.id } });
    if (!doc) throw new AppError("Document not found", 404);
    res.setHeader("Cache-Control", "no-store");
    res.json({ data: { url: downloadUrl(doc.storageKey) } });
  } catch (e) { next(e); }
}

export async function deleteDocument(req: Request, res: Response, next: NextFunction) {
  try {
    const where = { id: req.params.id, userId: req.user!.id, tenantId: req.user!.id };
    const doc = await prisma.document.findFirst({ where });
    if (!doc) throw new AppError("Document not found", 404);
    await deletePdf(doc.storageKey);
    await prisma.document.deleteMany({ where });
    res.sendStatus(204);
  } catch (e) { next(e); }
}

export function handleDocumentUploadError(err: unknown, _req: Request, res: Response, next: NextFunction) {
  if ((err as { type?: string })?.type === "entity.too.large") { res.status(413).json({ message: "PDF files must be 20 MB or smaller" }); return; }
  next(err);
}
