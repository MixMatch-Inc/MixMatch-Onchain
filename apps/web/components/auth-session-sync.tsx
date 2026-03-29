'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';

const AUTH_COOKIE_NAME = 'mixmatch_auth_token';

export function AuthSessionSync() {
  const token = useAuthStore((state) => state.token);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const logout = useAuthStore((state) => state.logout);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      const hasCookie = document.cookie.includes(`${AUTH_COOKIE_NAME}=`);

      if (hasCookie) {
        document.cookie = `${AUTH_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax`;
      }

      return;
    }

    document.cookie = `${AUTH_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; SameSite=Lax`;
  }, [isAuthenticated, token]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const hasCookie = document.cookie.includes(`${AUTH_COOKIE_NAME}=`);

    if (!hasCookie) {
      logout();
    }
  }, [isAuthenticated, logout]);

  return null;
}
