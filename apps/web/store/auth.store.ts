'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { UserRole } from '@mixmatch/types';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  onboardingCompleted: boolean;
}

interface LoginPayload {
  user: AuthUser;
  token?: string;
}

interface AuthStore {
  user: AuthUser | null;
  role: UserRole | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (data: LoginPayload) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      role: null,
      token: null,
      isAuthenticated: false,
      login: ({ user, token }) => {
        set({
          user,
          role: user.role,
          token: token ?? null,
          isAuthenticated: true,
        });
      },
      logout: () => {
        set({
          user: null,
          role: null,
          token: null,
          isAuthenticated: false,
        });

        if (typeof window !== 'undefined') {
          window.location.assign('/');
        }
      },
    }),
    {
      name: 'mixmatch-auth-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        role: state.role,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
