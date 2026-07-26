import { useState, useEffect, useCallback } from 'react';
import { getMe, refreshToken as apiRefreshToken } from '../services/api-client';

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
  refreshToken?: string;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const stored = JSON.parse(raw) as StoredAuth;
        setUser(stored.user);
        setAccessToken(stored.accessToken);
        setRefreshToken(stored.refreshToken ?? null);
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
    setRefreshToken(auth.refreshToken ?? null);
  }, []);

  const logout = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Storage unavailable
    }
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
  }, []);

  const refresh = useCallback(async (): Promise<boolean> => {
    if (!refreshToken) return false;
    try {
      const result = await apiRefreshToken(refreshToken);
      const updated: StoredAuth = {
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      };
      setAuth(updated);
      return true;
    } catch {
      logout();
      return false;
    }
  }, [refreshToken, setAuth, logout]);

  return { user, accessToken, refreshToken, isLoading, setAuth, logout, refresh };
}
