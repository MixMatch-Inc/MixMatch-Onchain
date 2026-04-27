import crypto from 'crypto';

export interface CooldownEntry {
  attempts: number;
  firstAttemptAt: number;
  lockedUntil?: number;
}

export interface CooldownResult {
  allowed: boolean;
  /** Seconds until the cooldown expires (only set when allowed=false) */
  retryAfterSeconds?: number;
  attempts: number;
}

export interface AuthCooldownPolicy {
  /** Rolling window in ms */
  windowMs: number;
  /** Max attempts before cooldown is triggered */
  maxAttempts: number;
  /** Lockout duration in ms once maxAttempts is exceeded */
  lockoutMs: number;
}

const DEFAULT_POLICIES: Record<string, AuthCooldownPolicy> = {
  signup: { windowMs: 60_000, maxAttempts: 5, lockoutMs: 5 * 60_000 },
  login: { windowMs: 60_000, maxAttempts: 10, lockoutMs: 15 * 60_000 },
  verify: { windowMs: 60_000, maxAttempts: 5, lockoutMs: 5 * 60_000 },
  reset: { windowMs: 60_000, maxAttempts: 3, lockoutMs: 30 * 60_000 },
};

/**
 * One-way hash of an identifier (email/IP) so we never store PII in the store.
 */
function hashIdentifier(identifier: string): string {
  return crypto.createHash('sha256').update(identifier).digest('hex');
}

/**
 * In-memory cooldown store for per-identifier rate limiting.
 * In production this should be backed by Redis for multi-instance deployments.
 */
export class AuthCooldownStore {
  private readonly store = new Map<string, CooldownEntry>();

  private key(operation: string, identifier: string): string {
    return `${operation}:${hashIdentifier(identifier)}`;
  }

  /**
   * Record an attempt and check whether the identifier is allowed to proceed.
   */
  check(
    operation: string,
    identifier: string,
    policy?: AuthCooldownPolicy,
  ): CooldownResult {
    const p = policy ?? DEFAULT_POLICIES[operation] ?? DEFAULT_POLICIES['login'];
    const k = this.key(operation, identifier);
    const now = Date.now();
    const entry = this.store.get(k);

    // Locked out
    if (entry?.lockedUntil && now < entry.lockedUntil) {
      const retryAfterSeconds = Math.ceil((entry.lockedUntil - now) / 1000);
      return { allowed: false, retryAfterSeconds, attempts: entry.attempts };
    }

    // Window expired — reset
    if (!entry || now - entry.firstAttemptAt > p.windowMs) {
      this.store.set(k, { attempts: 1, firstAttemptAt: now });
      return { allowed: true, attempts: 1 };
    }

    const attempts = entry.attempts + 1;

    if (attempts > p.maxAttempts) {
      const lockedUntil = now + p.lockoutMs;
      this.store.set(k, { ...entry, attempts, lockedUntil });
      const retryAfterSeconds = Math.ceil(p.lockoutMs / 1000);
      return { allowed: false, retryAfterSeconds, attempts };
    }

    this.store.set(k, { ...entry, attempts });
    return { allowed: true, attempts };
  }

  /** Reset the cooldown for an identifier (e.g. on successful login) */
  reset(operation: string, identifier: string): void {
    this.store.delete(this.key(operation, identifier));
  }
}

export const authCooldownStore = new AuthCooldownStore();
