/**
 * requireAuth middleware — AUTH-052
 *
 * Validates the Bearer access token on every protected route.
 * Attaches the decoded claims to `res.locals.auth` so downstream
 * handlers can read userId and role without re-verifying.
 *
 * Usage:
 *   app.get("/api/v1/protected", requireAuth, handler)
 *
 * Extension points:
 *  - Add role-based gating by composing requireRole(UserRole.DJ) after this
 *  - Swap verifyAccessToken for a JWKS-based verifier in a later milestone
 */

import type { Request, Response, NextFunction } from "express";
import type { UserRole } from "@themixmatch/types";
import { verifyAccessToken } from "../services/jwt.service.js";
import { AuthError } from "../utils/errors.js";

export interface AuthLocals {
  userId: string;
  role: UserRole;
}

/**
 * Extracts and verifies the Bearer token from the Authorization header.
 * Calls next(err) with AUTH_UNAUTHORIZED on any failure so the global
 * error handler formats the response consistently.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return next(AuthError.unauthorized());
  }

  const token = header.slice(7);

  try {
    const payload = verifyAccessToken(token);
    (res.locals as AuthLocals & Record<string, unknown>).userId = payload.userId;
    (res.locals as AuthLocals & Record<string, unknown>).role = payload.role;
    next();
  } catch {
    next(AuthError.unauthorized());
  }
}

/**
 * Role-based gate — compose after requireAuth.
 *
 * Example:
 *   app.get("/dj-only", requireAuth, requireRole(UserRole.DJ), handler)
 */
export function requireRole(...roles: UserRole[]) {
  return (_req: Request, res: Response, next: NextFunction): void => {
    const { role } = res.locals as AuthLocals;
    if (!roles.includes(role)) {
      return next(AuthError.unauthorized());
    }
    next();
  };
}
