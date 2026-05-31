import type { AuthSession } from "@themixmatch/types";

const STORAGE_KEY = "mixmatch:auth-session";

export async function loadAuthSession(): Promise<AuthSession | null> {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export async function saveAuthSession(session: AuthSession): Promise<void> {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

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
  },

  clearSession(): void {
    localStorage.removeItem(SESSION_KEY);
  },
};
