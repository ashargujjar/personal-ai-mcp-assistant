import { PDFParse } from "pdf-parse";

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
