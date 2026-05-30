"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { LoginRequest, ApiSuccess, ApiError, AuthUserPayload, SessionBootstrap } from "@themixmatch/types";
import { authStorage } from "../../auth/auth-storage";
import { useAuthStore } from "../../auth/auth-store";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

interface UseLoginReturn {
  login: (input: LoginRequest) => Promise<void>;
  loading: boolean;
  error: string | null;
}

export function useLogin(): UseLoginReturn {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = async (input: LoginRequest) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      const data = (await res.json()) as
        | ApiSuccess<{ token: string; user: AuthUserPayload; session: SessionBootstrap }>
        | ApiError;

      if (!data.success) {
        setError(data.message);
        return;
      }

      const { token, user, session } = data.data;

      authStorage.saveSession({ token, user, session });
      setSession(token, user, session);
      router.push("/");
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return { login, loading, error };
}
