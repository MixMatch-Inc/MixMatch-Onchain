import type {
  AuthThrottleState,
  AuthCooldownState,
  ISOTimestamp,
} from '@stella/types/auth';

const WINDOW_SECONDS    = 60;
const MAX_ATTEMPTS      = 5;
const COOLDOWN_TIERS_S  = [30, 120, 600, 3600]; // 30s, 2m, 10m, 1h

interface WindowEntry {
  timestamps: number[]; // Unix ms of each attempt in the current window
}

interface CooldownEntry {
  failureCount: number;
  expiresAt: number; // Unix ms
}

const windowStore   = new Map<string, WindowEntry>();
const cooldownStore = new Map<string, CooldownEntry>();

/**
 * Records one failed auth attempt and returns the updated throttle + cooldown
 * state. Call this on every failure path.
 */
export function recordFailure(identity: string): {
  throttle: AuthThrottleState;
  cooldown: AuthCooldownState;
} {
  pruneWindow(identity);
  const entry = windowStore.get(identity) ?? { timestamps: [] };
  entry.timestamps.push(Date.now());
  windowStore.set(identity, entry);

  const throttle = buildThrottleState(identity);

  // Promote to cooldown when rate limit is freshly breached
  if (throttle.limited) {
    applyNextCooldownTier(identity);
  }

  return { throttle, cooldown: buildCooldownState(identity) };
}

/**
 * Clears the failure window and cooldown for an identity.
 * Call on successful login/signup.
 */
export function clearFailures(identity: string): void {
  windowStore.delete(identity);
  cooldownStore.delete(identity);
}

/** Returns current throttle state without recording an attempt. */
export function getThrottleState(identity: string): AuthThrottleState {
  pruneWindow(identity);
  return buildThrottleState(identity);
}

/** Returns current cooldown state without recording an attempt. */
export function getCooldownState(identity: string): AuthCooldownState {
  return buildCooldownState(identity);
}

/**
 * Returns true when the identity is blocked by either throttle or cooldown.
 * Use this as the fast-path guard before touching Supabase.
 */
export function isBlocked(identity: string): boolean {
  pruneWindow(identity);
  return buildThrottleState(identity).limited || buildCooldownState(identity).active;
}

function pruneWindow(identity: string): void {
  const entry = windowStore.get(identity);
  if (!entry) return;
  const cutoff = Date.now() - WINDOW_SECONDS * 1000;
  entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
  if (entry.timestamps.length === 0) {
    windowStore.delete(identity);
  } else {
    windowStore.set(identity, entry);
  }
}

function buildThrottleState(identity: string): AuthThrottleState {
  const entry    = windowStore.get(identity);
  const count    = entry?.timestamps.length ?? 0;
  const limited  = count >= MAX_ATTEMPTS;
  const oldest   = entry?.timestamps[0] ?? null;
  const resetsAt = limited && oldest
    ? new Date(oldest + WINDOW_SECONDS * 1000).toISOString() as ISOTimestamp
    : null;

  return {
    limited,
    attemptsRemaining: limited ? null : MAX_ATTEMPTS - count,
    resetsAt,
    windowSeconds: WINDOW_SECONDS,
    maxAttempts:   MAX_ATTEMPTS,
  };
}

function buildCooldownState(identity: string): AuthCooldownState {
  const entry = cooldownStore.get(identity);
  if (!entry || Date.now() > entry.expiresAt) {
    // Expired cooldowns are not deleted here to preserve failureCount;
    // active=false signals the client the lockout is lifted.
    return {
      active:          false,
      expiresAt:       null,
      failureCount:    entry?.failureCount ?? 0,
      durationSeconds: 0,
    };
  }
  const tier = Math.min(entry.failureCount - 1, COOLDOWN_TIERS_S.length - 1);
  return {
    active:          true,
    expiresAt:       new Date(entry.expiresAt).toISOString() as ISOTimestamp,
    failureCount:    entry.failureCount,
    durationSeconds: COOLDOWN_TIERS_S[tier] ?? COOLDOWN_TIERS_S[COOLDOWN_TIERS_S.length - 1]!,
  };
}

function applyNextCooldownTier(identity: string): void {
  const existing    = cooldownStore.get(identity);
  const failCount   = (existing?.failureCount ?? 0) + 1;
  const tierIndex   = Math.min(failCount - 1, COOLDOWN_TIERS_S.length - 1);
  const durationMs  = (COOLDOWN_TIERS_S[tierIndex] ?? COOLDOWN_TIERS_S[COOLDOWN_TIERS_S.length - 1]!) * 1000;
  cooldownStore.set(identity, {
    failureCount: failCount,
    expiresAt:    Date.now() + durationMs,
  });
}
