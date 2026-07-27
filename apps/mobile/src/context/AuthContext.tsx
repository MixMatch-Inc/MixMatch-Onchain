import * as SecureStore from 'expo-secure-store';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { refreshToken as apiRefreshToken } from '../services/api-client';

const STORAGE_KEY = 'mixmatch.auth';

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoredAuth {
  user: AuthUser;
  accessToken: string;
  refreshToken?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  setAuth: (auth: StoredAuth) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function safelyParseStoredAuth(raw: string): StoredAuth | null {
  try {
    const parsed = JSON.parse(raw) as StoredAuth;
    if (!parsed.user || !parsed.accessToken) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Auth state, backed by `expo-secure-store` (encrypted on-device
 * persistence — the previous implementation used `localStorage`, which
 * isn't a real React Native API and only worked under Jest's polyfill).
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshTokenValue, setRefreshTokenValue] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const raw = await SecureStore.getItemAsync(STORAGE_KEY);
        if (cancelled) return;

        if (raw) {
          const stored = safelyParseStoredAuth(raw);
          if (stored) {
            setUser(stored.user);
            setAccessToken(stored.accessToken);
            setRefreshTokenValue(stored.refreshToken ?? null);
          } else {
            await SecureStore.deleteItemAsync(STORAGE_KEY);
          }
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const setAuth = useCallback(async (auth: StoredAuth) => {
    try {
      await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(auth));
    } catch {
      // Storage unavailable — auth still works in memory for this session.
    }
    setUser(auth.user);
    setAccessToken(auth.accessToken);
    setRefreshTokenValue(auth.refreshToken ?? null);
  }, []);

  const logout = useCallback(async () => {
    try {
      await SecureStore.deleteItemAsync(STORAGE_KEY);
    } catch {
      // best effort
    }
    setUser(null);
    setAccessToken(null);
    setRefreshTokenValue(null);
  }, []);

  const refresh = useCallback(async (): Promise<boolean> => {
    if (!refreshTokenValue) return false;
    try {
      const result = await apiRefreshToken(refreshTokenValue);
      await setAuth({
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
      return true;
    } catch {
      await logout();
      return false;
    }
  }, [refreshTokenValue, setAuth, logout]);

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        refreshToken: refreshTokenValue,
        isLoading,
        setAuth,
        logout,
        refresh,
      }}
    >
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

