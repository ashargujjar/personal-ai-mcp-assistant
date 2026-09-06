import type { CalendarEvent } from "@/types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";
const DEFAULT_EVENT_COLOR = "239 84% 67%";

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

  async listEvents(token: string | null, range?: { timeMin: string; timeMax: string }): Promise<CalendarEvent[]> {
    const query = range ? `?timeMin=${encodeURIComponent(range.timeMin)}&timeMax=${encodeURIComponent(range.timeMax)}` : "";
    const res = await fetch(`${API_URL}/calendar/events${query}`, { headers: authHeaders(token) });
    if (!res.ok) {
      const json = await res.json().catch(() => null);
      throw new Error(json?.message ?? "Failed to load Calendar events");
    }
    const json = await res.json();
    const events: Array<{
      id: string;
      title: string;
      start: string;
      end: string;
      location?: string;
      attendees?: string[];
    }> = json.data;
    return events.map((e) => ({
      id: e.id,
      title: e.title,
      start: e.start,
      end: e.end,
      location: e.location,
      attendees: e.attendees ?? [],
      color: DEFAULT_EVENT_COLOR,
    }));
  },
};
