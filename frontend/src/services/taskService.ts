import type { Priority, Source, Task, TaskStatus } from "@/types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";

function authHeaders(token: string | null): HeadersInit {
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function parseResponse<T>(res: Response, fallbackMessage: string): Promise<T> {
  if (!res.ok) {
    const json = await res.json().catch(() => null);
    throw new Error(json?.message ?? fallbackMessage);
  }
  const json = await res.json();
  return json.data as T;
}

export const taskService = {
  async list(token: string | null): Promise<Task[]> {
    const res = await fetch(`${API_URL}/tasks`, { headers: authHeaders(token) });
    return parseResponse<Task[]>(res, "Failed to load tasks");
  },

  async create(
    token: string | null,
    input: {
      title: string;
      description?: string;
      priority: Priority;
      deadline?: string;
      project?: string;
      source?: Source;
    },
  ): Promise<Task> {
    const res = await fetch(`${API_URL}/tasks`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify(input),
    });
    return parseResponse<Task>(res, "Failed to create task");
  },

  async updateStatus(token: string | null, id: string, status: TaskStatus): Promise<Task> {
    const res = await fetch(`${API_URL}/tasks/${id}`, {
      method: "PATCH",
      headers: authHeaders(token),
      body: JSON.stringify({ status }),
    });
    return parseResponse<Task>(res, "Failed to update task");
  },

  async update(token: string | null, id: string, patch: Partial<Task>): Promise<Task> {
    const { title, description, priority, deadline, project, source, status } = patch;
    const res = await fetch(`${API_URL}/tasks/${id}`, {
      method: "PATCH",
      headers: authHeaders(token),
      body: JSON.stringify({ title, description, priority, deadline, project, source, status }),
    });
    return parseResponse<Task>(res, "Failed to update task");
  },

  async remove(token: string | null, id: string): Promise<void> {
    const res = await fetch(`${API_URL}/tasks/${id}`, { method: "DELETE", headers: authHeaders(token) });
    if (!res.ok) {
      const json = await res.json().catch(() => null);
      throw new Error(json?.message ?? "Failed to delete task");
    }
  },
};
