export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

export interface AuthGuardOptions {
  requireRole?: UserRole;
  allowSameUser?: boolean;
}

export interface GuardResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Authenticated request object that includes user identification.
 * This can be extended by framework-specific request types (e.g., Express Request)
 * to add authentication context.
 */
export interface AuthenticatedRequest {
  userId?: string;
  role?: UserRole | string;
}