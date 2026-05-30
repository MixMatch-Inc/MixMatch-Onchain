import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import type { AuthSession, SignupRequest } from "@themixmatch/types";

import { AuthClientError, register } from "./authClient";
import { clearAuthSession, loadAuthSession, saveAuthSession } from "./authStorage";

type AuthStatus = "loading" | "signedOut" | "signedIn";

export interface AuthContextValue {
  status: AuthStatus;
  session: AuthSession | null;
  lastError: AuthClientError | null;
  registerAccount: (input: SignupRequest) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return value;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [session, setSession] = useState<AuthSession | null>(null);
  const [lastError, setLastError] = useState<AuthClientError | null>(null);

  useEffect(() => {
    let mounted = true;

    loadAuthSession()
      .then((stored) => {
        if (!mounted) return;
        if (stored) {
          setSession(stored);
          setStatus("signedIn");
          return;
        }
        setStatus("signedOut");
      })
      .catch((error) => {
        if (!mounted) return;
        setLastError(
          error instanceof AuthClientError
            ? error
            : new AuthClientError("invalid_response", "Failed to load session", {
                details: error,
              }),
        );
        setStatus("signedOut");
      });

    return () => {
      mounted = false;
    };
  }, []);

  const registerAccount = useCallback(async (input: SignupRequest) => {
    setLastError(null);
    const nextSession = await register(input);
    await saveAuthSession(nextSession);
    setSession(nextSession);
    setStatus("signedIn");
  }, []);

  const signOut = useCallback(async () => {
    setLastError(null);
    await clearAuthSession();
    setSession(null);
    setStatus("signedOut");
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      session,
      lastError,
      registerAccount,
      signOut,
    }),
    [lastError, registerAccount, session, signOut, status],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
