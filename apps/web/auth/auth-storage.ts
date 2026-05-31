import type { AuthSession } from "@themixmatch/types";

const SESSION_STORAGE_KEY =
  "mixmatch_auth_session";

export const authStorage = {
  saveSession(session: AuthSession) {
    localStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify(session),
    );
  },

  loadSession(): AuthSession | null {
    const raw = localStorage.getItem(
      SESSION_STORAGE_KEY,
    );

    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as AuthSession;
      if (
        !parsed?.token ||
        !parsed?.user ||
        !parsed?.session
      ) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  },

  clearSession() {
    localStorage.removeItem(
      SESSION_STORAGE_KEY,
    );
  },
};