"use client";

import { useState } from "react";
import type { LoginRequest } from "@themixmatch/types";
import { login, AuthClientError } from "../../auth/auth-client";

export function useLogin() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitLogin = async (input: LoginRequest): Promise<boolean> => {
    setSubmitting(true);
    setError(null);
    try {
      const session = await login(input);
      return true;
    } catch (caught) {
      if (caught instanceof AuthClientError) {
        setError(caught.message);
      } else if (caught instanceof Error) {
        setError(caught.message);
      } else {
        setError("Sign in failed");
      }
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  return { submitLogin, submitting, error };
}
