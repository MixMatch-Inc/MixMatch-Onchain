import type { AuthSession, ProtectedRouteGuard, SessionContinuityOutcome } from "@themixmatch/types";

import { introspectSession, refreshSession } from "./auth-client";
import { isSessionExpired } from "./auth-session";

/**
 * Shared session seam — validates a stored session and refreshes when needed.
 * Web and mobile clients follow the same contract-driven flow.
 */
export async function ensureSessionContinuity(
  stored: AuthSession,
): Promise<SessionContinuityOutcome> {
  if (isSessionExpired(stored)) {
    if (!stored.refreshToken) {
      return { status: "expired" };
    }

    try {
      const refreshed = await refreshSession(stored.refreshToken);
      return {
        status: "refreshed",
        session: {
          ...stored,
          token: refreshed.accessToken,
          refreshToken: refreshed.refreshToken,
          session: {
            ...stored.session,
            issuedAt: new Date().toISOString(),
          },
        },
      };
    } catch {
      return { status: "expired" };
    }
  }

  const introspection = await introspectSession(stored.token);
  if (introspection.valid) {
    return { status: "valid", session: stored };
  }

  if (!stored.refreshToken) {
    return { status: "expired" };
  }

  try {
    const refreshed = await refreshSession(stored.refreshToken);
    const nextSession: AuthSession = {
      ...stored,
      token: refreshed.accessToken,
      refreshToken: refreshed.refreshToken,
      session: {
        ...stored.session,
        issuedAt: new Date().toISOString(),
      },
    };
    return { status: "refreshed", session: nextSession };
  } catch {
    return { status: "expired" };
  }
}

/** Maps a stored session to the shared protected-route guard contract. */
export function evaluateProtectedRouteGuard(
  session: AuthSession | null,
): ProtectedRouteGuard {
  if (!session?.token) {
    return { allowed: false, reason: "missing_session" };
  }

  return {
    allowed: true,
    userId: session.user.id,
    role: session.user.role,
  };
}
