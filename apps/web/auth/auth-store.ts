import { create } from "zustand";
import type { AuthUserPayload, SessionBootstrap } from "@themixmatch/types";

interface AuthState {
  user: AuthUserPayload | null;
  session: SessionBootstrap | null;
  token: string | null;
  setSession: (token: string, user: AuthUserPayload, session: SessionBootstrap) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  token: null,

  setSession: (token, user, session) =>
    set({ token, user, session }),

  clearSession: () =>
    set({ token: null, user: null, session: null }),
}));
