import type { NextFunction, Request, Response } from "express";
import type { AuditService } from "./audit.service.js";

/**
 * Audit trail — rate limiting integration.
 *
 * Track: audit trail | rate limiting  |  Sprint 1
 * Issues: #797 (rate limiting integrate/document), #799 (audit trail implement)
 *
 * This middleware wraps a route handler and records a RATE_LIMIT_EXCEEDED
 * audit event when the upstream rate-limit middleware has already rejected
 * the request (status 429). It also records ACCESS_DENIED events for
 * authentication failures (401/403).
 *
 * Usage:
 *
 *   app.use("/api/auth", auditResponseEvents(auditService), createAuthRouter());
 *
 * The middleware is fire-and-forget: audit write failures are caught and
 * logged but never propagate to the client.
 */
export function auditResponseEvents(audit: AuditService) {
  return (_req: Request, res: Response, next: NextFunction): void => {
    const originalJson = res.json.bind(res);

    res.json = (body: unknown) => {
      // Fire-and-forget: do not block the response path
      recordAuditEvent(audit, res.statusCode, body, _req).catch(() => {});
      return originalJson(body);
    };

    next();
  };
}

async function recordAuditEvent(
  audit: AuditService,
  statusCode: number,
  body: unknown,
  req: Request,
): Promise<void> {
  const context = {
    ip: extractIp(req),
    userAgent: req.headers["user-agent"],
    resourceId: req.path,
    metadata: { method: req.method, statusCode },
  };

  if (statusCode === 429) {
    await audit.record("RATE_LIMIT_EXCEEDED", context);
    return;
  }

  if (statusCode === 401 || statusCode === 403) {
    const code = extractErrorCode(body);
    await audit.record("ACCESS_DENIED", {
      ...context,
      metadata: { ...context.metadata, errorCode: code },
    });
  }
}

function extractIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  return typeof forwarded === "string"
    ? (forwarded.split(",")[0] ?? "").trim()
    : req.ip ?? req.socket?.remoteAddress ?? "unknown";
}

function extractErrorCode(body: unknown): string | undefined {
  if (
    typeof body === "object" &&
    body \!== null &&
    "error" in body &&
    typeof (body as Record<string, unknown>).error === "object"
  ) {
    const err = (body as { error: Record<string, unknown> }).error;
    return typeof err.code === "string" ? err.code : undefined;
  }
  return undefined;
}
