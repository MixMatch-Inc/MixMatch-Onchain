export type AuditAction =
  | 'USER_REGISTERED'
  | 'USER_LOGGED_IN'
  | 'USER_LOGGED_OUT'
  | 'PROFILE_UPDATED'
  | 'TOKEN_REFRESHED'
  | 'SESSION_REVOKED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'ACCESS_DENIED';

export interface AuditEntry {
  id: string;
  action: AuditAction;
  actorId?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  timestamp: string;
}
