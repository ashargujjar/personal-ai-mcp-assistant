import type { KnowledgeDocument } from "@/types";
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";
interface DocumentRecord { id: string; originalFilename: string; fileSize: number; pageCount: number | null; status: KnowledgeDocument["status"]; createdAt: string }
function mapDocument(doc: DocumentRecord): KnowledgeDocument { return { id: doc.id, filename: doc.originalFilename, sizeKb: doc.fileSize / 1024, pageCount: doc.pageCount ?? undefined, status: doc.status, uploadedAt: doc.createdAt }; }
async function request<T>(token: string | null, path = "", init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}/documents${path}`, { ...init, headers: { ...init.headers, Authorization: `Bearer ${token}` } });
  if (!response.ok) { const error = await response.json().catch(() => null); throw new Error(error?.message ?? "Document request failed"); }
  if (response.status === 204) return undefined as T;
  return (await response.json()).data;
}
export const knowledgeService = {
  async list(token: string | null): Promise<KnowledgeDocument[]> { return (await request<DocumentRecord[]>(token)).map(mapDocument); },
  async upload(token: string | null, file: File): Promise<KnowledgeDocument> {
    if (!/\.pdf$/i.test(file.name) || file.size === 0 || file.size > 20 * 1024 * 1024) throw new Error("Choose a PDF file between 1 byte and 20 MB");
    return mapDocument(await request<DocumentRecord>(token, `?${new URLSearchParams({ filename: file.name })}`, { method: "POST", headers: { "Content-Type": "application/pdf" }, body: file }));
  },
  async remove(token: string | null, id: string): Promise<void> { await request(token, `/${encodeURIComponent(id)}`, { method: "DELETE" }); },
  async download(token: string | null, id: string): Promise<void> { const { url } = await request<{ url: string }>(token, `/${encodeURIComponent(id)}/download`); window.location.assign(url); },
};
