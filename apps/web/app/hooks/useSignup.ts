"use client";

import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import type { SignupRequest, SignupResponse } from "@themixmatch/types";
import { useAuthStore } from "../../auth/auth-store";
import { authStorage } from "../../auth/auth-storage";
import { signup } from "../../auth/auth-client";

export function useSignup() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);

  const mutation = useMutation({
    mutationFn: (payload: SignupRequest) => signup(payload),

    onSuccess: (response) => {
      if (!response.success) {
        return;
      }

      const { token, user, session } = response.data;

      authStorage.saveSession({ token, user, session });
      setSession(token, user, session);
      router.push("/");
    },
  });

  return mutation;
}
