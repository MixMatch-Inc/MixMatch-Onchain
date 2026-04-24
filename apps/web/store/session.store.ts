'use client';

import { create } from 'zustand';
import { AccountStatus, ModerationState, UserRole } from '@mixmatch/types';

export type BootstrapStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface ActorContext {
  userId: string;
  role: UserRole;
  accountStatus: AccountStatus;
  moderationState: ModerationState;
  profileComplete: boolean;
  blindModeEligible: boolean;
  unreadResonances: number;
}

interface SessionStore {
  status: BootstrapStatus;
  actor: ActorContext | null;
  error: string | null;
  setLoading: () => void;
  setReady: (actor: ActorContext) => void;
  setError: (message: string) => void;
  reset: () => void;
}

export const useSessionStore = create<SessionStore>((set) => ({
  status: 'idle',
  actor: null,
  error: null,
  setLoading: () => set({ status: 'loading', error: null }),
  setReady: (actor) => set({ status: 'ready', actor, error: null }),
  setError: (error) => set({ status: 'error', error, actor: null }),
  reset: () => set({ status: 'idle', actor: null, error: null }),
}));
