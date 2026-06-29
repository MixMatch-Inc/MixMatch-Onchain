import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'mixmatch.auth';

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

interface StoredAuth {
  user: AuthUser;
  accessToken: string;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const stored = JSON.parse(raw) as StoredAuth;
        setUser(stored.user);
        setAccessToken(stored.accessToken);
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setAuth = useCallback((auth: StoredAuth) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
    } catch {
      // Storage full or unavailable
    }
    setUser(auth.user);
    setAccessToken(auth.accessToken);
  }, []);

  const logout = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Storage unavailable
    }
    setUser(null);
    setAccessToken(null);
  }, []);

  return { user, accessToken, isLoading, setAuth, logout };
}
