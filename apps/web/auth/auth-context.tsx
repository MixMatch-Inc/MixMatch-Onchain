"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import type { AuthSession } from "@themixmatch/types";
import { authStorage } from "./auth-storage";
import { isSessionExpired } from "./auth-session";

interface AuthContextValue {
  session: AuthSession | null;
  user: AuthSession["user"] | null;
  isAuthenticated: boolean;
  signIn(session: AuthSession): void;
  signOut(): void;
}

const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
);

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [session, setSession] = useState<AuthSession | null>(null);

  useEffect(() => {
    const stored = authStorage.loadSession();
    if (stored && !isSessionExpired(stored)) {
      setSession(stored);
      return;
    }

    authStorage.clearSession();
    setSession(null);
  }, []);

  const signIn = useCallback((authSession: AuthSession) => {
    authStorage.saveSession(authSession);
    setSession(authSession);
  }, []);

  const signOut = useCallback(() => {
    authStorage.clearSession();
    setSession(null);
  }, []);

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      isAuthenticated: Boolean(session),
      signIn,
      signOut,
    }),
    [session, signIn, signOut],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
