import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import { validateRequest } from '../../utils/validation';
import { resolveTrackReference } from './track-resolution.controller';
import {
  resolveTrackReferenceBodySchema,
  resolveTrackReferenceQuerySchema,
} from './track-resolution.validation';
import { sendError } from '../../utils/api-response';

// ── Simple in-memory rate limiter (per user, per minute) ──────────────────────
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 60;

const requestCounts = new Map<string, { count: number; resetAt: number }>();

const rateLimiter = (req: Request, res: Response, next: NextFunction): void => {
  const userId = req.user?.userId ?? req.ip ?? 'anonymous';
  const now = Date.now();
  const entry = requestCounts.get(userId);

  if (!entry || now > entry.resetAt) {
    requestCounts.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return next();
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    sendError(res, 429, 'Rate limit exceeded. Please wait before retrying.');
    return;
  }

  entry.count += 1;
  next();
};

// ── Router ─────────────────────────────────────────────────────────────────────

const tracksRouter = Router();

/**
 * POST /tracks/resolve
 * Authenticated, rate-limited endpoint for resolving provider IDs to
 * canonical track references with preview strategy hints.
 */
tracksRouter.post(
  '/resolve',
  requireAuth,
  rateLimiter,
  validateRequest({
    body: resolveTrackReferenceBodySchema,
    query: resolveTrackReferenceQuerySchema,
  }),
  resolveTrackReference,
);

export default tracksRouter;
