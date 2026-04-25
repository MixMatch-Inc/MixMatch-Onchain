import { create } from 'zustand';
import type { IUser } from '@mixmatch/types';
import { tokenStorage } from '@/lib/tokenStorage';
import { apiRequest } from '@/lib/apiClient';

interface SessionState {
  user: IUser | null;
  token: string | null;
  isHydrated: boolean;
  isAuthenticated: boolean;
}

interface SessionActions {
  /** Restore token from secure storage and re-fetch /auth/me */
  bootstrap: () => Promise<void>;
  login: (token: string, user: IUser) => Promise<void>;
  logout: () => Promise<void>;
}

export const useSessionStore = create<SessionState & SessionActions>((set, get) => ({
  user: null,
  token: null,
  isHydrated: false,
  isAuthenticated: false,

  async bootstrap() {
    const token = await tokenStorage.get();
    if (!token) {
      set({ isHydrated: true });
      return;
    }
    try {
      const { user } = await apiRequest<{ user: IUser }>('/auth/me', { token });
      set({ user, token, isAuthenticated: true, isHydrated: true });
    } catch {
      // Token invalid / expired — clear it
      await tokenStorage.clear();
      set({ isHydrated: true });
    }
  },

  async login(token, user) {
    await tokenStorage.set(token);
    set({ token, user, isAuthenticated: true });
  },

  async logout() {
    await tokenStorage.clear();
    set({ user: null, token: null, isAuthenticated: false });
  },
}));

/** Call once at app startup (e.g. in app.tsx or a bootstrap effect). */
export function bootstrapSession() {
  return useSessionStore.getState().bootstrap();
}
