'use client';

import { useEffect, useRef } from 'react';
import { AccountStatus, ModerationState } from '@mixmatch/types';
import { useAuthStore } from '@/store/auth.store';
import { useSessionStore } from '@/store/session.store';
import { apiRequest } from '@/lib/api/client';

interface MeResponse {
  user: {
    id: string;
    role: string;
    accountStatus?: AccountStatus;
    moderationState?: ModerationState;
    onboardingCompleted: boolean;
    privacySettings?: { blindListeningEligible?: boolean };
  };
}

interface UnreadResponse {
  unreadResonances: number;
}

/**
 * SessionBootstrap (#203)
 * Hydrates the typed actor context store once per session.
 * Protected routes can read from useSessionStore without duplicate fetches.
 */
export function SessionBootstrap() {
  const token = useAuthStore((s) => s.token);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const logout = useAuthStore((s) => s.logout);
  const { status, setLoading, setReady, setError } = useSessionStore();
  const bootstrapped = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || !token || bootstrapped.current || status === 'ready') return;
    bootstrapped.current = true;
    setLoading();

    Promise.all([
      apiRequest<MeResponse>('/auth/me', { token }),
      apiRequest<UnreadResponse>('/resonance/unread', { token }).catch(() => ({ unreadResonances: 0 })),
    ])
      .then(([meRes, unreadRes]) => {
        const u = meRes.user;
        setReady({
          userId: u.id,
          role: u.role as import('@mixmatch/types').UserRole,
          accountStatus: u.accountStatus ?? AccountStatus.ACTIVE,
          moderationState: u.moderationState ?? ModerationState.CLEAR,
          profileComplete: u.onboardingCompleted,
          blindModeEligible: u.privacySettings?.blindListeningEligible ?? false,
          unreadResonances: unreadRes.unreadResonances,
        });
      })
      .catch(() => {
        setError('Session could not be loaded. Please log in again.');
        logout();
      });
  }, [isAuthenticated, token, status, setLoading, setReady, setError, logout]);

  return null;
}
