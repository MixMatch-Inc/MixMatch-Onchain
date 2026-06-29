'use client';

import type { AuthUser } from '@mixmatch/shared';
import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
import { refreshAccessToken, fetchAuthenticated, ApiError } from '@/lib/api-client';

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

function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const payloadStr = parts[1] as string;
    const payload = JSON.parse(atob(payloadStr));
    return typeof payload.exp === 'number' && payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

function writeStorage(auth: StoredAuth): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
}

function clearStorage(): void {
  window.localStorage.removeItem(STORAGE_KEY);
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
        if (stored.refreshToken && isTokenExpired(stored.accessToken)) {
          setIsRefreshing(true);
          refreshAccessToken(stored.refreshToken)
            .then((result) => {
              setUser(result.user);
              setAccessToken(result.accessToken);
              setRefreshTokenValue(result.refreshToken);
              writeStorage(result);
            })
            .catch(() => {
              clearStorage();
            })
            .finally(() => setIsRefreshing(false));
        } else if (!isTokenExpired(stored.accessToken)) {
          setUser(stored.user);
          setAccessToken(stored.accessToken);
          setRefreshTokenValue(stored.refreshToken);
        } else {
          clearStorage();
        }
      } catch {
        clearStorage();
      }
    }
    setIsLoading(false);
  }, []);

  const setAuth = useCallback((auth: StoredAuth) => {
    writeStorage(auth);
    setUser(auth.user);
    setAccessToken(auth.accessToken);
    setRefreshTokenValue(auth.refreshToken);
  }, []);

  const logout = useCallback(() => {
    clearStorage();
    setUser(null);
    setAccessToken(null);
    setRefreshTokenValue(null);
  }, []);

  const fetchWithAuth = useCallback(<T,>(path: string, options?: RequestInit): Promise<T> => {
    const token = accessToken;
    const refreshTok = refreshTokenValue;

    if (token && !isTokenExpired(token)) {
      const result = fetchAuthenticated<T>(path, token, options);
      if (refreshTok) {
        return result.catch((error) => {
          if (error instanceof ApiError && (error.code === 'UNAUTHORIZED' || error.code === 'INVALID_REFRESH_TOKEN')) {
            return performRefresh<T>(path, refreshTok, options);
          }
          throw error;
        });
      }
      return result;
    }

    if (!refreshTok) {
      throw new ApiError('Not authenticated', 'UNAUTHORIZED');
    }

    return performRefresh<T>(path, refreshTok, options);
  }, [accessToken, refreshTokenValue]);

  async function performRefresh<T>(
    path: string,
    refreshTok: string,
    options?: RequestInit,
  ): Promise<T> {
    setIsRefreshing(true);

    try {
      if (!refreshPromiseRef.current) {
        refreshPromiseRef.current = refreshAccessToken(refreshTok)
          .then((result) => {
            const stored: StoredAuth = {
              user: result.user,
              accessToken: result.accessToken,
              refreshToken: result.refreshToken,
            };
            setUser(stored.user);
            setAccessToken(stored.accessToken);
            setRefreshTokenValue(stored.refreshToken);
            writeStorage(stored);
            return stored;
          })
          .catch((error) => {
            clearStorage();
            setUser(null);
            setAccessToken(null);
            setRefreshTokenValue(null);
            throw error;
          })
          .finally(() => {
            refreshPromiseRef.current = null;
          });
      }

      const stored = await refreshPromiseRef.current;
      return await fetchAuthenticated<T>(path, stored.accessToken, options);
    } catch {
      throw new ApiError('Session expired. Please log in again.', 'SESSION_EXPIRED');
    } finally {
      setIsRefreshing(false);
    }
  }

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
