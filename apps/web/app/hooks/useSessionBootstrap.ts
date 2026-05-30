"use client";

import { useEffect } from "react";
import type { AuthUserPayload, SessionBootstrap } from "@themixmatch/types";
import { useAuthStore } from "../../auth/auth-store";
import { authStorage } from "../../auth/auth-storage";

export function useSessionBootstrap() {
  const setSession = useAuthStore((s) => s.setSession);

  useEffect(() => {
    const stored = authStorage.loadSession();
    if (!stored) return;

    setSession(stored.token, stored.user as AuthUserPayload, stored.session as SessionBootstrap);
  }, [setSession]);
}
