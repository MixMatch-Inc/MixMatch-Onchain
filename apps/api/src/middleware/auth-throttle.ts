import type { Request, Response, NextFunction } from "express";
import type { AuthAbuseCooldown, AuthFailureEnvelope, ThrottleNotice } from "@themixmatch/types";

interface FailureRecord {
  count: number;
  firstFailAt: number;
  lockedUntil?: number;
}

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

const _failureStore = new Map<string, FailureRecord>();

export const _throttleStore = {
  record(key: string): FailureRecord {
    const now = Date.now();
    const existing = _failureStore.get(key);
    if (!existing || now - existing.firstFailAt > WINDOW_MS) {
      const entry: FailureRecord = { count: 1, firstFailAt: now };
      _failureStore.set(key, entry);
      return entry;
    }
    existing.count++;
    if (existing.count >= MAX_FAILURES && !existing.lockedUntil) {
      existing.lockedUntil = now + LOCKOUT_MS;
    }
    return existing;
  },
  get(key: string): FailureRecord | undefined {
    return _failureStore.get(key);
  },
  clear() {
    _failureStore.clear();
  },
};

function extractCredentialKey(req: Request): string {
  const body = req.body as Record<string, unknown>;
  if (typeof body.email === "string") return `email:${body.email.toLowerCase()}`;
  return `ip:${req.ip ?? "unknown"}`;
}

/**
 * Checks whether the credential in the request body is under an active
 * lockout before allowing the login or register attempt to proceed.
 *
 * On lockout: returns 429 with a typed `AuthFailureEnvelope` that includes
 * both `throttle` and `cooldown` notices so clients can render specific UI.
 *
 * Does NOT record a new failure — call `recordAuthFailure` from the service
 * layer after a failed credential check to keep concerns separated.
 */
export function checkAuthThrottle(req: Request, res: Response, next: NextFunction): void {
  const key = extractCredentialKey(req);
  const record = _throttleStore.get(key);

  if (record?.lockedUntil && Date.now() < record.lockedUntil) {
    const retryAfter = Math.ceil((record.lockedUntil - Date.now()) / 1000);
    const throttle: ThrottleNotice = { throttled: true, retryAfter, attemptsRemaining: 0 };
    const cooldown: AuthAbuseCooldown = {
      active: true,
      resetAt: new Date(record.lockedUntil).toISOString(),
      reason: "too_many_attempts",
      failedAttempts: record.count,
    };
    const body: AuthFailureEnvelope = {
      success: false,
      code: "AUTH_RATE_LIMITED",
      message: "Too many failed attempts — please wait before trying again.",
      throttle,
      cooldown,
    };
    res.setHeader("Retry-After", String(retryAfter));
    res.status(429).json(body);
    return;
  }

  next();
}

/**
 * Records a failed auth attempt for the credential in `req.body`.
 * Call this after a confirmed credential failure (wrong password, unknown email).
 * Returns the updated ThrottleNotice so callers can embed it in the error response.
 */
export function recordAuthFailure(req: Request): ThrottleNotice {
  const key = extractCredentialKey(req);
  const record = _throttleStore.record(key);
  const attemptsRemaining = Math.max(0, MAX_FAILURES - record.count);

  if (record.lockedUntil) {
    const retryAfter = Math.ceil((record.lockedUntil - Date.now()) / 1000);
    return { throttled: true, retryAfter, attemptsRemaining: 0 };
  }

  return { throttled: false, attemptsRemaining };
}
