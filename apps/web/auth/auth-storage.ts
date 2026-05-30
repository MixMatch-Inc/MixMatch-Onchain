const SESSION_KEY = "themixmatch_session";

export interface StoredSession {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    onboardingCompleted: boolean;
  };
  session: {
    userId: string;
    role: string;
    onboardingCompleted: boolean;
    issuedAt: string;
  };
}

export const authStorage = {
  saveSession(data: StoredSession): void {
    localStorage.setItem(SESSION_KEY, JSON.stringify(data));
  },

  loadSession(): StoredSession | null {
    const stored = localStorage.getItem(SESSION_KEY);
    if (!stored) return null;
    try {
      return JSON.parse(stored) as StoredSession;
    } catch {
      return null;
    }
  },

  clearSession(): void {
    localStorage.removeItem(SESSION_KEY);
  },
};
