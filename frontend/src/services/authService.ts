import type { AuthResponse, LoginInput, SignupInput } from "@/types/auth";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";

async function request<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    const fieldErrors = json?.errors?.fieldErrors as Record<string, string[]> | undefined;
    const firstFieldError = fieldErrors ? Object.values(fieldErrors).flat()[0] : undefined;
    throw new Error(firstFieldError ?? json?.message ?? "Something went wrong");
  }

  return json.data as T;
}

export const authService = {
  signup(input: SignupInput): Promise<AuthResponse> {
    return request<AuthResponse>("/auth/signup", input);
  },
  login(input: LoginInput): Promise<AuthResponse> {
    return request<AuthResponse>("/auth/login", input);
  },
};
