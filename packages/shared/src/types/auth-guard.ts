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
