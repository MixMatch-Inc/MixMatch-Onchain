import type { Request } from 'express';
import type { AuthGuardOptions, GuardResult } from '@mixmatch/shared';
import { UserRole } from '@mixmatch/shared';

export type { AuthGuardOptions, GuardResult };
export { UserRole };

export interface AuthenticatedRequest extends Request {
  userId?: string;
  role?: string;
}
