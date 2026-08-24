import AsyncStorage from '@react-native-async-storage/async-storage';
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
    let cancelled = false;

    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (cancelled || !raw) return;
        try {
          const stored = JSON.parse(raw) as StoredAuth;
          if (stored.user && stored.accessToken) {
            setUser(stored.user);
            setAccessToken(stored.accessToken);
          }
        } catch {
          void AsyncStorage.removeItem(STORAGE_KEY);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const setAuth = useCallback((auth: AuthTokenResponse) => {
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(auth)).catch(() => {
      // storage full or unavailable — auth still works in memory for this session
    });
    setUser(auth.user);
    setAccessToken(auth.accessToken);
  }, []);

  const logout = useCallback(() => {
    void AsyncStorage.removeItem(STORAGE_KEY);
    setUser(null);
    setAccessToken(null);
  }, []);

  return { user, accessToken, isLoading, setAuth, logout };
}
