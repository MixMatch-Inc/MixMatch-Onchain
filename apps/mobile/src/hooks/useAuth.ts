import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AuthTokenResponse, AuthUser } from '@mixmatch/shared';
import * as SecureStore from 'expo-secure-store';
import { useCallback, useEffect, useState } from 'react';

const SECURE_KEY = 'mixmatch.auth';
const LEGACY_KEY = 'mixmatch.auth.legacy';

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
    void (async () => {
      let stored: StoredAuth | null = null;
      try {
        const raw = await SecureStore.getItemAsync(SECURE_KEY);
        if (raw) stored = JSON.parse(raw) as StoredAuth;
      } catch {
        stored = null;
      }
      const legacy = await AsyncStorage.getItem(LEGACY_KEY);
      if (legacy) {
        try {
          stored = stored ?? (JSON.parse(legacy) as StoredAuth);
        } catch {
          stored = null;
        }
        await AsyncStorage.removeItem(LEGACY_KEY);
      }
      if (cancelled) return;
      if (stored?.user && stored.accessToken) {
        setUser(stored.user);
        setAccessToken(stored.accessToken);
        await SecureStore.setItemAsync(SECURE_KEY, JSON.stringify(stored)).catch(() => undefined);
      }
      setIsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setAuth = useCallback((auth: AuthTokenResponse) => {
    void SecureStore.setItemAsync(SECURE_KEY, JSON.stringify(auth)).catch(() => undefined);
    setUser(auth.user);
    setAccessToken(auth.accessToken);
  }, []);

  const logout = useCallback(() => {
    void SecureStore.deleteItemAsync(SECURE_KEY).catch(() => undefined);
    void AsyncStorage.removeItem(LEGACY_KEY);
    setUser(null);
    setAccessToken(null);
  }, []);

  return { user, accessToken, isLoading, setAuth, logout };
}
