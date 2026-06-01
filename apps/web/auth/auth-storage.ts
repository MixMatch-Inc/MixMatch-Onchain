import type { AuthSession } from "@themixmatch/types";

const STORAGE_KEY = "mixmatch:auth-session";

function isValidSession(value: unknown): value is AuthSession {
  if (typeof value !== "object" || value === null) return false;
  const parsed = value as AuthSession;
  return Boolean(parsed.token && parsed.user && parsed.session);
}

export const authStorage = {
  loadSession(): AuthSession | null {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    try {
      const parsed: unknown = JSON.parse(raw);
      return isValidSession(parsed) ? parsed : null;
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
  },

  saveSession(session: AuthSession): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  },

  clearSession(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE_KEY);
  },
};
