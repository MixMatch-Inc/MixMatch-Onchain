/**
 * Session handlers — AUTH-052
 *
 * POST /api/v1/auth/refresh    — rotate a refresh token, get a new pair
 * GET  /api/v1/auth/introspect — validate an access token, return claims
 */

import type { Request, Response } from "express";
import { z } from "zod";
import { refreshSession, introspectSession } from "./session.service.js";
import { sendSuccess } from "../../utils/api-response.js";
import { ValidationError } from "../../utils/errors.js";

const refreshBodySchema = z.object({
  refreshToken: z.string().min(1),
});

// ── POST /api/v1/auth/refresh ─────────────────────────────────────────────────

export const refreshHandler = async (req: Request, res: Response): Promise<void> => {
  const parsed = refreshBodySchema.safeParse(req.body);
  if (!parsed.success) {
    throw ValidationError.invalidInput("body", req.body, "refreshToken is required");
  }

  const result = await refreshSession(parsed.data.refreshToken);
  sendSuccess(res, 200, result);
};

// ── GET /api/v1/auth/introspect ───────────────────────────────────────────────

export const introspectHandler = (req: Request, res: Response): void => {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : "";

  const result = introspectSession(token);
  // Always 200 — callers check result.valid
  sendSuccess(res, 200, result);
};
