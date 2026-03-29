'use client';

import { useEffect, useRef } from 'react';
import { UserRole } from '@mixmatch/types';
import { useAuthStore } from '@/store/auth.store';

interface MeResponse {
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    onboardingCompleted: boolean;
  };
}

const AUTH_COOKIE_NAME = 'mixmatch_auth_token';

const readAuthCookie = (): string | null => {
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${AUTH_COOKIE_NAME}=([^;]+)`),
  );

  return match ? decodeURIComponent(match[1]) : null;
};

export function AuthBootstrap() {
  const login = useAuthStore((state) => state.login);
  const logout = useAuthStore((state) => state.logout);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasBootstrapped = useRef(false);

  useEffect(() => {
    if (hasBootstrapped.current) {
      return;
    }

    hasBootstrapped.current = true;

    const token = readAuthCookie();

    if (!token || isAuthenticated) {
      return;
    }

    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL?.trim() || 'http://localhost:3001';

    void fetch(`${apiBaseUrl}/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('Session is invalid');
        }

        const payload = (await response.json()) as MeResponse;

        if (!payload.user) {
          throw new Error('Session is invalid');
        }

        login({
          user: payload.user,
          token,
        });
      })
      .catch(() => {
        logout();
      });
  }, [isAuthenticated, login, logout]);

  return null;
}
