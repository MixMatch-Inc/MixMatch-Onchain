'use client';

import type { AuthUser } from '@mixmatch/shared';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { getCurrentUser } from './api-client';

const STORAGE_KEY = 'mixmatch.auth';

interface StoredAuth {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  isLoading: boolean;
  setAuth: (auth: StoredAuth) => void;
  logout: () => void;
  fetchWithAuth: <T>(path: string, options?: RequestInit) => Promise<T>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function isExpiredToken(token: string): boolean {
  const segment = token.split('.')[1];
  if (!segment) return false;
  try {
    const payload = JSON.parse(atob(segment));
    if (typeof payload.exp !== 'number') return false;
    return payload.exp * 1000 < Date.now();
  } catch {
    return false;
  }
}

function safelyParseStoredAuth(raw: string): StoredAuth | null {
  try {
    const parsed = JSON.parse(raw) as StoredAuth;
    if (!parsed.user || !parsed.accessToken) return null;
    if (typeof parsed.accessToken !== 'string') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      setIsLoading(false);
      return;
    }

    const stored = safelyParseStoredAuth(raw);
    if (!stored || isExpiredToken(stored.accessToken)) {
      window.localStorage.removeItem(STORAGE_KEY);
      setIsLoading(false);
      return;
    }

    setUser(stored.user);
    setAccessToken(stored.accessToken);

    getCurrentUser(stored.accessToken)
      .then(({ user: serverUser }) => {
        setUser(serverUser);
        setIsLoading(false);
      })
      .catch(() => {
        window.localStorage.removeItem(STORAGE_KEY);
        setUser(null);
        setAccessToken(null);
        setIsLoading(false);
      });
  }, []);

  const setAuth = useCallback((auth: StoredAuth) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
    } catch {
      // storage full or unavailable — auth still works in memory
    }
    setUser(auth.user);
    setAccessToken(auth.accessToken);
  }, []);

  const logout = useCallback(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // best effort
    }
    setUser(null);
    setAccessToken(null);
  }, []);

  const fetchWithAuth = useCallback(
    async <T,>(path: string, options: RequestInit = {}): Promise<T> => {
      const headers = new Headers(options.headers);
      if (accessToken) {
        headers.set('Authorization', `Bearer ${accessToken}`);
      }
      const response = await fetch(path, { ...options, headers });
      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }
      return response.json() as Promise<T>;
    },
    [accessToken],
  );

  return (
    <AuthContext.Provider value={{ user, accessToken, isLoading, setAuth, logout, fetchWithAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
