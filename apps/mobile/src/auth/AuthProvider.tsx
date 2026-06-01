import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import type { AuthSession, LoginRequest, SignupRequest } from "@themixmatch/types";

import { AuthClientError, login as loginClient, logoutSession, register } from "./authClient";
import { clearAuthSession, loadAuthSession, saveAuthSession } from "./authStorage";
import { ensureSessionContinuity } from "./sessionContinuity";

type AuthStatus = "loading" | "signedOut" | "signedIn";

export interface AuthContextValue {
  status: AuthStatus;
  session: AuthSession | null;
  lastError: AuthClientError | null;
  registerAccount: (input: SignupRequest) => Promise<void>;
  signIn: (input: LoginRequest) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used within AuthProvider");
  return value;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [session, setSession] = useState<AuthSession | null>(null);
  const [lastError, setLastError] = useState<AuthClientError | null>(null);

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      try {
        const stored = await loadAuthSession();
        if (!mounted) return;

        if (!stored) {
          setStatus("signedOut");
          return;
        }

        const outcome = await ensureSessionContinuity(stored);
        if (!mounted) return;

        if (outcome.status === "expired") {
          await clearAuthSession();
          setSession(null);
          setStatus("signedOut");
          return;
        }

        await saveAuthSession(outcome.session);
        setSession(outcome.session);
        setStatus("signedIn");
      } catch (error) {
        if (!mounted) return;
        setLastError(error instanceof AuthClientError ? error : new AuthClientError("invalid_response", "Failed to load session", { details: error }));
        setStatus("signedOut");
      }
    }

    void bootstrap();
    return () => { mounted = false; };
  }, []);

  const registerAccount = useCallback(async (input: SignupRequest) => {
    setLastError(null);
    const nextSession = await register(input);
    await saveAuthSession(nextSession);
    setSession(nextSession);
    setStatus("signedIn");
  }, []);

  const signIn = useCallback(async (input: LoginRequest) => {
    setLastError(null);
    const nextSession = await loginClient(input);
    await saveAuthSession(nextSession);
    setSession(nextSession);
    setStatus("signedIn");
  }, []);

  const signOut = useCallback(async () => {
    setLastError(null);
    const refreshToken = session?.refreshToken;
    await clearAuthSession();
    setSession(null);
    setStatus("signedOut");
    if (refreshToken) {
      try {
        await logoutSession(refreshToken);
      } catch {
        // Local session is already cleared — server revocation is best-effort
      }
    }
  }, [session?.refreshToken]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      session,
      lastError,
      registerAccount,
      signIn,
      signOut,
    }),
    [lastError, registerAccount, session, signOut, status],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
