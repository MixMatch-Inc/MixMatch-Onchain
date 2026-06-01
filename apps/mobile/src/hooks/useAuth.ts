import { useState, useCallback, useEffect, useRef } from 'react';
import {
  AuthUser,
  RateLimitState,
  AuthRiskSignal,
  cooldownSecondsRemaining,
  isCooldownExpired,
} from '@repo/types/auth';
import {
  login,
  register,
  logout as serviceLogout,
  getCurrentRateLimitState,
} from '../services/auth.service';

export interface AuthState {
  /** Authenticated user, or null when logged out. */
  user: AuthUser | null;
  isLoading: boolean;
  /** Generic error message safe to display. */
  errorMessage: string | null;
  /** Per-field validation errors keyed by field name. */
  fieldErrors: Partial<Record<'email' | 'password' | 'displayName', string>>;
  /** Present when the account is throttled. */
  rateLimit: RateLimitState | null;
  /** Seconds remaining in the cooldown. Ticks down via interval. */
  cooldownSecondsLeft: number;
  /** Risk signal attached to the current session. */
  sessionRisk: AuthRiskSignal | null;
  /** Security notice from the server (e.g. "new device detected"). */
  securityNotice: string | null;
}

const INITIAL_STATE: AuthState = {
  user: null,
  isLoading: false,
  errorMessage: null,
  fieldErrors: {},
  rateLimit: null,
  cooldownSecondsLeft: 0,
  sessionRisk: null,
  securityNotice: null,
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth() {
  const [state, setState] = useState<AuthState>(INITIAL_STATE);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Seed rate-limit state from storage on mount (handles app restarts mid-cooldown)
  useEffect(() => {
    getCurrentRateLimitState().then(rl => {
      if (rl.isLockedOut && !isCooldownExpired(rl.cooldownUntil)) {
        setState(s => ({
          ...s,
          rateLimit: rl,
          cooldownSecondsLeft: cooldownSecondsRemaining(rl.cooldownUntil),
        }));
        startCountdown(rl.cooldownUntil!);
      }
    });
    return () => stopCountdown();
  }, []);

  function startCountdown(cooldownUntil: string) {
    stopCountdown();
    countdownRef.current = setInterval(() => {
      const secs = cooldownSecondsRemaining(cooldownUntil);
      if (secs <= 0) {
        stopCountdown();
        setState(s => ({
          ...s,
          rateLimit: s.rateLimit
            ? { ...s.rateLimit, isLockedOut: false, cooldownUntil: null, attemptsRemaining: s.rateLimit.maxAttempts }
            : null,
          cooldownSecondsLeft: 0,
          errorMessage: null,
        }));
      } else {
        setState(s => ({ ...s, cooldownSecondsLeft: secs }));
      }
    }, 1_000);
  }

  function stopCountdown() {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }

  function setLoading() {
    setState(s => ({ ...s, isLoading: true, errorMessage: null, fieldErrors: {} }));
  }

  const handleLogin = useCallback(async (email: string, password: string) => {
    setLoading();
    const result = await login(email, password);

    if (result.ok) {
      stopCountdown();
      setState({
        ...INITIAL_STATE,
        user: result.data.user,
        sessionRisk: result.data.riskSignal,
        securityNotice: result.data.securityNotice,
      });
      return;
    }

    const { error, rateLimit } = result;
    const newState: Partial<AuthState> = {
      isLoading: false,
      errorMessage: error.message,
      fieldErrors: (error.fieldErrors as AuthState['fieldErrors']) ?? {},
      rateLimit: rateLimit ?? null,
      cooldownSecondsLeft: rateLimit ? cooldownSecondsRemaining(rateLimit.cooldownUntil) : 0,
    };

    setState(s => ({ ...s, ...newState }));

    if (rateLimit?.isLockedOut && rateLimit.cooldownUntil) {
      startCountdown(rateLimit.cooldownUntil);
    }
  }, []);

  const handleRegister = useCallback(
    async (email: string, password: string, displayName: string) => {
      setLoading();
      const result = await register(email, password, displayName);

      if (result.ok) {
        stopCountdown();
        setState({
          ...INITIAL_STATE,
          user: result.data.user,
          sessionRisk: result.data.riskSignal,
          securityNotice: result.data.securityNotice,
        });
        return;
      }

      const { error, rateLimit } = result;
      setState(s => ({
        ...s,
        isLoading: false,
        errorMessage: error.message,
        fieldErrors: (error.fieldErrors as AuthState['fieldErrors']) ?? {},
        rateLimit: rateLimit ?? null,
        cooldownSecondsLeft: rateLimit ? cooldownSecondsRemaining(rateLimit.cooldownUntil) : 0,
      }));

      if (rateLimit?.isLockedOut && rateLimit.cooldownUntil) {
        startCountdown(rateLimit.cooldownUntil);
      }
    },
    [],
  );

  const handleLogout = useCallback(async () => {
    await serviceLogout();
    stopCountdown();
    setState(INITIAL_STATE);
  }, []);

  const dismissSecurityNotice = useCallback(() => {
    setState(s => ({ ...s, securityNotice: null }));
  }, []);

  return {
    ...state,
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
    dismissSecurityNotice,
  };
}