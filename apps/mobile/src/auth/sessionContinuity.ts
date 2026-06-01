import type { AuthSession, ProtectedRouteGuard, SessionContinuityOutcome } from "@themixmatch/types";

import { introspectSession, refreshSession } from "./authClient";

export async function ensureSessionContinuity(
  stored: AuthSession,
): Promise<SessionContinuityOutcome> {
  const introspection = await introspectSession(stored.token);
  if (introspection.valid) {
    return { status: "valid", session: stored };
  }

  if (!stored.refreshToken) {
    return { status: "expired" };
  }

  try {
    const refreshed = await refreshSession({ refreshToken: stored.refreshToken });
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
