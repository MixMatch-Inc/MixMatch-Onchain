import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import { UserRole } from "@themixmatch/types";
import type { RefreshTokenPayload } from "@themixmatch/types";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-key-change-in-production";

/** Access token TTL — short-lived */
const ACCESS_TOKEN_EXPIRES_IN = "15m";
/** Refresh token TTL — long-lived */
const REFRESH_TOKEN_EXPIRES_IN = "7d";
/** Milliseconds for access token expiry (used to compute expiresAt) */
const ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000;

export interface AccessTokenPayload {
  userId: string;
  role: UserRole;
}

// ── Access token ─────────────────────────────────────────────────────────────

export function generateAccessToken(userId: string, role: UserRole): string {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES_IN });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, JWT_SECRET) as AccessTokenPayload;
}

/** ISO-8601 timestamp for when a freshly-issued access token will expire */
export function accessTokenExpiresAt(): string {
  return new Date(Date.now() + ACCESS_TOKEN_TTL_MS).toISOString();
}

// ── Refresh token ─────────────────────────────────────────────────────────────

export function generateRefreshToken(userId: string, role: UserRole): { token: string; jti: string } {
  const jti = randomUUID();
  const token = jwt.sign({ userId, role, jti }, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });
  return { token, jti };
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, JWT_SECRET) as RefreshTokenPayload;
}

// ── Legacy alias (kept so existing callers compile without changes) ───────────

/** @deprecated Use generateAccessToken instead */
export const generateToken = generateAccessToken;
/** @deprecated Use verifyAccessToken instead */
export const verifyToken = verifyAccessToken;
