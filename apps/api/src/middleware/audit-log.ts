import type { Request } from "express";
import type { AuthAuditEntry, AuthAuditEventKind } from "@themixmatch/types";

/**
 * Emits a structured auth audit entry to stdout.
 *
 * The structured format is consumed as-is in development and is intentionally
 * parseable by log aggregators (Datadog, Loki, CloudWatch) in production.
 * Swap the `console.log` call for a transport (e.g. Winston, Pino) at the
 * injection point without changing callers.
 *
 * Extension point: replace the body of `logAuthEvent` with a proper logger
 * or emit to an event bus (audit queue) in a later milestone.
 */
export function logAuthEvent(
  event: AuthAuditEventKind,
  options?: {
    req?: Request;
    userId?: string;
    boundary?: AuthAuditEntry["boundary"];
    meta?: Record<string, unknown>;
  },
): void {
  const entry: AuthAuditEntry = {
    event,
    userId: options?.userId,
    ip: options?.req ? (options.req.ip ?? options.req.headers["x-forwarded-for"]?.toString()) : undefined,
    timestamp: new Date().toISOString(),
    boundary: options?.boundary ?? "api",
    meta: options?.meta,
  };

  console.log(JSON.stringify({ audit: entry }));
}
