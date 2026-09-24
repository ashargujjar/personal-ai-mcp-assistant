import { PDFParse } from "pdf-parse";
import type { Prisma } from "@prisma/client";
import { prisma } from "../db/connect";
import { downloadUrl } from "./cloudinary";

export interface ResumePdfTextExtraction {
  source: {
    filename: string;
    pageCount: number;
  };
  pages: Array<{
    pageNumber: number;
    width: number;
    height: number;
    rawText: string;
    words: unknown[];
    lines: string[];
    tables: unknown[];
  }>;
  fullText: string;
}

export async function extractResumePdfText(
  pdf: Buffer,
  filename: string,
): Promise<ResumePdfTextExtraction> {
  const parser = new PDFParse({ data: pdf });

  try {
    const result = await parser.getText();
    const pages = result.pages.map((page) => ({
      pageNumber: page.num,
      width: 0,
      height: 0,
      rawText: page.text,
      words: [],
      lines: page.text.split(/\r?\n/).filter(Boolean),
      tables: [],
    }));

    return {
      source: {
        filename,
        pageCount: result.total,
      },
      pages,
      fullText: result.text.trim(),
    };
  } finally {
    await parser.destroy();
  }
}

export async function extractAndStoreResumePdfText(
  pdf: Buffer,
  filename: string,
  applicantId: string,
  userId: string,
): Promise<ResumePdfTextExtraction> {
  const extraction = await extractResumePdfText(pdf, filename);

  await prisma.resumeApplicant.updateMany({
    where: {
      id: applicantId,
      userId,
    },
    data: {
      pdfTextExtraction: extraction as unknown as Prisma.InputJsonObject,
      pdfTextExtractedAt: new Date(),
    },
  });

  return extraction;
}

export async function extractAndStoreResumePdfTextFromCloudinary(
  publicId: string,
  filename: string,
  applicantId: string,
  userId: string,
): Promise<ResumePdfTextExtraction> {
  const response = await fetch(downloadUrl(publicId), {
    signal: AbortSignal.timeout(60000),
  });

  if (!response.ok) {
    throw new Error("Failed to download resume PDF from Cloudinary");
  }

  const pdf = Buffer.from(await response.arrayBuffer());
  if (pdf.length < 5 || pdf.subarray(0, 5).toString() !== "%PDF-") {
    throw new Error("Cloudinary file is not a valid PDF");
  }

  return extractAndStoreResumePdfText(pdf, filename, applicantId, userId);
}
