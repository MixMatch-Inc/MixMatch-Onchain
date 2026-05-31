/**
 * Session service — AUTH-052
 *
 * Owns the refresh and introspect flows. All token lifecycle decisions
 * (rotation, revocation, expiry checks) live here so route handlers stay thin.
 *
 * Extension points for later milestones:
 *  - Swap refreshTokenRepository for a Redis/DB-backed store
 *  - Add device fingerprinting to the refresh record
 *  - Emit session events (audit log, analytics)
 */

import type { SessionRefreshResponse, IntrospectResponse } from "@themixmatch/types";
import { container } from "../../config/di.js";
import {
  verifyRefreshToken,
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  accessTokenExpiresAt,
} from "../../services/jwt.service.js";
import { AuthError } from "../../utils/errors.js";

// ── Refresh ───────────────────────────────────────────────────────────────────

/**
 * Validates the incoming refresh token, rotates it (issues a new pair),
 * and revokes the consumed token.
 *
 * Throws AUTH_UNAUTHORIZED for any invalid / expired / revoked token.
 */
export async function refreshSession(rawToken: string): Promise<SessionRefreshResponse> {
  // 1. Verify JWT signature and expiry
  let payload: ReturnType<typeof verifyRefreshToken>;
  try {
    payload = verifyRefreshToken(rawToken);
  } catch {
    throw AuthError.unauthorized();
  }

  // 2. Check the token is still in the store and not revoked
  const record = await container.refreshTokenRepository.findByJti(payload.jti);
  if (!record || record.revoked) {
    throw AuthError.unauthorized();
  }

  // 3. Confirm the stored record hasn't expired (belt-and-suspenders)
  if (new Date(record.expiresAt) < new Date()) {
    await container.refreshTokenRepository.revoke(payload.jti);
    throw AuthError.unauthorized();
  }

  // 4. Revoke the consumed token (rotation — one-time use)
  await container.refreshTokenRepository.revoke(payload.jti);

  // 5. Issue a new pair
  const accessToken = generateAccessToken(payload.userId, payload.role);
  const { token: newRefreshToken, jti: newJti } = generateRefreshToken(payload.userId, payload.role);

  const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;
  await container.refreshTokenRepository.save({
    jti: newJti,
    userId: payload.userId,
    expiresAt: new Date(Date.now() + REFRESH_TTL_MS).toISOString(),
    revoked: false,
  });

  return {
    accessToken,
    refreshToken: newRefreshToken,
    expiresAt: accessTokenExpiresAt(),
  };
}

// ── Introspect ────────────────────────────────────────────────────────────────

/**
 * Validates an access token and returns its claims.
 * Always returns a well-shaped object — never throws — so callers can
 * branch on `valid` without try/catch.
 */
export function introspectSession(rawToken: string): IntrospectResponse {
  try {
    const payload = verifyAccessToken(rawToken);
    return {
      valid: true,
      userId: payload.userId,
      role: payload.role,
      expiresAt: accessTokenExpiresAt(),
    };
  } catch {
    return { valid: false };
  }
}
