import * as React from "react";
import { authService } from "@/services/authService";
import type { AuthResponse, AuthUser, LoginInput, SignupInput } from "@/types/auth";

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  signup: (input: SignupInput) => Promise<void>;
  login: (input: LoginInput) => Promise<void>;
  logout: () => void;
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);
const STORAGE_KEY = "nexus-ai-auth";

function readStoredAuth(): AuthResponse | null {
  if (typeof window === "undefined") return null;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as AuthResponse;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = React.useState<AuthResponse | null>(readStoredAuth);

  const persist = React.useCallback((next: AuthResponse | null) => {
    setAuth(next);
    if (next) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    else window.localStorage.removeItem(STORAGE_KEY);
  }, []);

  const signup = React.useCallback(async (input: SignupInput) => {
    await authService.signup(input);
  }, []);

  const login = React.useCallback(
    async (input: LoginInput) => {
      const result = await authService.login(input);
      persist(result);
    },
    [persist]
  );

  const logout = React.useCallback(() => persist(null), [persist]);

  const value: AuthContextValue = {
    user: auth?.user ?? null,
    token: auth?.token ?? null,
    isAuthenticated: !!auth,
    signup,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
