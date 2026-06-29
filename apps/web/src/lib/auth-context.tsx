'use client';

import type { AuthUser } from '@mixmatch/shared';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
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
  isRefreshing: boolean;
  setAuth: (auth: StoredAuth) => void;
  logout: () => void;
  fetchWithAuth: <T>(path: string, options?: RequestInit) => Promise<T>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function isExpiredToken(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
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
  const [refreshTokenValue, setRefreshTokenValue] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshPromiseRef = useRef<Promise<StoredAuth> | null>(null);

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const stored = JSON.parse(raw) as StoredAuth;
        getCurrentUser(stored.accessToken)
          .then((res) => {
            setUser(res.user);
            setAccessToken(stored.accessToken);
          })
          .catch(() => {
            window.localStorage.removeItem(STORAGE_KEY);
          })
          .finally(() => setIsLoading(false));
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
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

  return (
    <AuthContext.Provider value={{ user, accessToken, isLoading, isRefreshing, setAuth, logout, fetchWithAuth }}>
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
