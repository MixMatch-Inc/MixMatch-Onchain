import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'mixmatch.auth';

export interface StoredAuth {
  user: {
    id: string;
    email: string;
    role: string;
  };
  accessToken: string;
  refreshToken?: string;
}

export function useAuth() {
  const [user, setUser] = useState<StoredAuth['user'] | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as StoredAuth;
        if (parsed.user && parsed.accessToken) {
          setUser(parsed.user);
          setAccessToken(parsed.accessToken);
        }
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
    setIsLoading(false);
  }, []);

  const setAuth = useCallback((auth: StoredAuth) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
    } catch {
      // storage full
    }
    setUser(auth.user);
    setAccessToken(auth.accessToken);
  }, []);

  const logout = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // best effort
    }
    setUser(null);
    setAccessToken(null);
  }, []);

  return { user, accessToken, isLoading, setAuth, logout };
}
