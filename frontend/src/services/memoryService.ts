import type { Memory, MemoryListResult } from "@/types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";

function authHeaders(token: string | null): HeadersInit {
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function parseResponse<T>(res: Response): Promise<T> {
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.message ?? "Something went wrong");
  }
  return json as T;
}

export const memoryService = {
  async list(token: string | null, page: number, limit: number, query?: string): Promise<MemoryListResult> {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (query?.trim()) params.set("q", query.trim());

    const res = await fetch(`${API_URL}/memory?${params.toString()}`, {
      headers: authHeaders(token),
    });
    return parseResponse<MemoryListResult>(res);
  },

  async create(token: string | null, content: string): Promise<Memory> {
    const res = await fetch(`${API_URL}/memory`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ type: "note", content }),
    });
    const json = await parseResponse<{ data: Memory }>(res);
    return json.data;
  },

  async remove(token: string | null, id: string): Promise<void> {
    const res = await fetch(`${API_URL}/memory/${id}`, {
      method: "DELETE",
      headers: authHeaders(token),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json?.message ?? "Something went wrong");
    }
  },
};
