const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";

function authHeaders(token: string | null): HeadersInit {
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export const calendarService = {
  async getStatus(token: string | null): Promise<{ connected: boolean }> {
    const res = await fetch(`${API_URL}/calendar/status`, { headers: authHeaders(token) });
    const json = await res.json();
    return json.data;
  },

  async getConnectUrl(token: string | null): Promise<string> {
    const res = await fetch(`${API_URL}/calendar/connect`, { headers: authHeaders(token) });
    const json = await res.json();
    return json.data.url;
  },

  async disconnect(token: string | null): Promise<void> {
    const res = await fetch(`${API_URL}/calendar/disconnect`, { method: "DELETE", headers: authHeaders(token) });
    if (!res.ok) {
      const json = await res.json().catch(() => null);
      throw new Error(json?.message ?? "Failed to disconnect Calendar");
    }
  },
};
