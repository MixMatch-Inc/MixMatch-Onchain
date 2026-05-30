"use client";

import { useCallback, useEffect, useState } from "react";
import type { AuthSession } from "@themixmatch/types";
import { loadAuthSession, saveAuthSession, clearAuthSession } from "../../auth/auth-storage";

export function useSessionBootstrap() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAuthSession()
      .then((stored) => {
        setSession(stored);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const updateSession = useCallback(async (next: AuthSession) => {
    await saveAuthSession(next);
    setSession(next);
  }, []);

  const clearSession = useCallback(async () => {
    await clearAuthSession();
    setSession(null);
  }, []);

  return { session, loading, updateSession, clearSession };
}
