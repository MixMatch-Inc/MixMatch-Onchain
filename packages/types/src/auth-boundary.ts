import type { AuthSession, SessionRefreshResponse } from "./auth.js";
import type { ProtectedRouteGuard } from "./session.types.js";

const STELLAR_SESSION_TOKEN_PREFIXES = ["local.", "eyJ"] as const;

/**
 * Shared route-guard evaluation for protected app surfaces.
 * Keeps the starter on one vocabulary for missing-session regressions.
 */
export function evaluateProtectedRouteGuard(
  session: Pick<AuthSession, "token" | "user"> | null,
): ProtectedRouteGuard {
  const token = session?.token?.trim();

  if (!token || !session) {
    return { allowed: false, reason: "missing_session" };
  }

  return {
    allowed: true,
    userId: session.user.id,
    role: session.user.role,
  };
}

/**
 * Shared continuity helper for applying a refresh response to a stored session
 * without losing ownership or wallet bootstrap metadata.
 */
export function continueSessionAfterRefresh(
  stored: AuthSession,
  refreshed: SessionRefreshResponse,
  issuedAt: string = new Date().toISOString(),
): AuthSession {
  return {
    ...stored,
    token: refreshed.accessToken,
    refreshToken: refreshed.refreshToken,
    session: {
      ...stored.session,
      issuedAt,
    },
  };
}

/**
 * Current auth-to-Stellar boundary accepts local dev tokens and JWT-shaped
 * session tokens. Signature validation remains a later milestone.
 */
export function isSupportedStellarSessionToken(sessionToken: string): boolean {
  const normalizedToken = sessionToken.trim();

  return (
    normalizedToken.length > 0 &&
    STELLAR_SESSION_TOKEN_PREFIXES.some((prefix) =>
      normalizedToken.startsWith(prefix),
    )
  );
}
