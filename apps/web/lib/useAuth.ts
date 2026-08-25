'use client';

import type { AuthTokenResponse, AuthUser } from '@mixmatch/shared';
import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'mixmatch.auth';

interface StoredAuth {
  user: AuthUser;
  accessToken: string;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const stored = JSON.parse(raw) as StoredAuth;
        if (stored.user && stored.accessToken) {
          setUser(stored.user);
          setAccessToken(stored.accessToken);
        }
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  const setAuth = useCallback((auth: AuthTokenResponse) => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
    setUser(auth.user);
    setAccessToken(auth.accessToken);
  }, []);

  const logout = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    setUser(null);
    setAccessToken(null);
  }, []);

  return { user, accessToken, isLoading, setAuth, logout };
}
