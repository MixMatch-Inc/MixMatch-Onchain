'use client';

import { useState, useCallback } from 'react';
import type {
  AuthResponse,
  AuthThrottleState,
  AuthCooldownState,
  AuthRiskSignal,
  AuthErrorCode,
} from '@stella/types/auth';

export type AuthFormMode = 'login' | 'signup';

export interface AuthFormState {
  email:        string;
  password:     string;
  loading:      boolean;
  /** Non-null when a server response has been received */
  error:        AuthErrorCode | null;
  /** Human-readable message from the server, safe to display */
  message:      string | null;
  success:      boolean;
  throttle:     AuthThrottleState | null;
  cooldown:     AuthCooldownState | null;
  risk:         AuthRiskSignal | null;
}

const INITIAL_STATE: AuthFormState = {
  email:    '',
  password: '',
  loading:  false,
  error:    null,
  message:  null,
  success:  false,
  throttle: null,
  cooldown: null,
  risk:     null,
};

export function useAuthForm(mode: AuthFormMode) {
  const [state, setState] = useState<AuthFormState>(INITIAL_STATE);

  const setField = useCallback(
    (field: 'email' | 'password') => (value: string) =>
      setState((s) => ({ ...s, [field]: value, error: null, message: null })),
    [],
  );

  const submit = useCallback(async () => {
    if (!state.email || !state.password) {
      setState((s) => ({
        ...s,
        error:   'INVALID_CREDENTIALS',
        message: 'Email and password are required.',
      }));
      return;
    }

    setState((s) => ({ ...s, loading: true, error: null, message: null }));

    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/signup';
      const res = await fetch(endpoint, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: state.email, password: state.password }),
      });

      const json = (await res.json()) as AuthResponse;

      setState((s) => ({
        ...s,
        loading:  false,
        success:  json.success,
        error:    json.error,
        message:  json.message,
        throttle: json.throttle ?? null,
        cooldown: json.cooldown ?? null,
        risk:     json.risk ?? null,
      }));
    } catch {
      setState((s) => ({
        ...s,
        loading: false,
        error:   'UNKNOWN',
        message: 'Something went wrong. Please try again.',
      }));
    }
  }, [mode, state.email, state.password]);

  const reset = useCallback(() => setState(INITIAL_STATE), []);

  return { state, setField, submit, reset };
}
