import { createHash, randomUUID } from 'crypto';
import type {
  AuthAuditEvent,
  AuthEventType,
  AuthUserId,
  SessionId,
} from '@stella/types/auth';

/**
 * Records one auth event. Fire-and-forget — never awaited on the hot path.
 * Errors are swallowed so a logging failure never blocks an auth response.
 */
export function writeAuditEvent(
  type:      AuthEventType,
  options: {
    userId?:    AuthUserId | null;
    sessionId?: SessionId | null;
    ip?:        string | null;
    userAgent?: string | null;
    metadata?:  AuthAuditEvent['metadata'];
  } = {},
): void {
  const event: AuthAuditEvent = {
    id:          randomUUID(),
    type,
    userId:      options.userId    ?? null,
    sessionId:   options.sessionId ?? null,
    ipHash:      options.ip        ? hashIp(options.ip) : null,
    userAgent:   options.userAgent ?? null,
    occurredAt:  new Date().toISOString(),
    metadata:    options.metadata  ?? {},
  };

  // Async sink — swap implementation without changing callers
  void persistEvent(event);
}

async function persistEvent(event: AuthAuditEvent): Promise<void> {
  try {
    // TODO(AUTH-107 SEAM): replace with Supabase insert or external sink
    // Example:
    //   await supabase.from('auth_audit_events').insert(event);
    console.log('[audit]', JSON.stringify(event));
  } catch (err) {
    // Swallowed — audit failure must never fail an auth request
    console.error('[audit] failed to persist event', err);
  }
}

/** One-way hash of an IP address. Never store raw IPs in audit logs. */
function hashIp(ip: string): string {
  return createHash('sha256').update(ip).digest('hex').slice(0, 16);
}
