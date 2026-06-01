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
import { logoutSession } from "./auth-client";
import { ensureSessionContinuity } from "./session-continuity";

interface AuthContextValue {
  session: AuthSession | null;
  user: AuthSession["user"] | null;
  isAuthenticated: boolean;
  isBootstrapping: boolean;
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
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      const stored = authStorage.loadSession();
      if (!stored) {
        if (mounted) {
          setSession(null);
          setIsBootstrapping(false);
        }
        return;
      }

      const outcome = await ensureSessionContinuity(stored);
      if (!mounted) return;

      if (outcome.status === "expired") {
        authStorage.clearSession();
        setSession(null);
      } else {
        authStorage.saveSession(outcome.session);
        setSession(outcome.session);
      }

      setIsBootstrapping(false);
    }

    void bootstrap();
    return () => {
      mounted = false;
    };
  }, []);

  const signIn = useCallback((authSession: AuthSession) => {
    authStorage.saveSession(authSession);
    setSession(authSession);
  }, []);

  const signOut = useCallback(() => {
    const refreshToken = session?.refreshToken;
    authStorage.clearSession();
    setSession(null);
    if (refreshToken) {
      void logoutSession(refreshToken).catch(() => undefined);
    }
  }, [session?.refreshToken]);

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      isAuthenticated: Boolean(session),
      isBootstrapping,
      signIn,
      signOut,
    }),
    [session, isBootstrapping, signIn, signOut],
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
