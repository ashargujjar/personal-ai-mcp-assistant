import { documents as seedDocuments } from "@/mock/knowledge";
import { sleep } from "@/lib/utils";
import type { KnowledgeDocument } from "@/types";

let documents: KnowledgeDocument[] = [...seedDocuments];

export const knowledgeService = {
  async list(): Promise<KnowledgeDocument[]> {
    await sleep(200);
    return [...documents].sort((a, b) => (a.uploadedAt < b.uploadedAt ? 1 : -1));
  },

  async upload(filename: string): Promise<KnowledgeDocument> {
    await sleep(400);
    const doc: KnowledgeDocument = {
      id: `doc-new-${Date.now()}`,
      filename,
      sizeKb: Math.round(200 + Math.random() * 3000),
      status: "processing",
      uploadedAt: new Date().toISOString(),
    };
    documents = [doc, ...documents];
    return doc;
  },

  async remove(id: string): Promise<void> {
    await sleep(200);
    documents = documents.filter((d) => d.id !== id);
  },
};
