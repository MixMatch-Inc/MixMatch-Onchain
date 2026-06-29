import type { Request } from 'express';
import type { AuthGuardOptions, GuardResult, AuthenticatedRequest as BaseAuthenticatedRequest } from '@mixmatch/shared';
import { UserRole } from '@mixmatch/shared';

export type { AuthGuardOptions, GuardResult, BaseAuthenticatedRequest };
export { UserRole };

export interface AuthenticatedRequest extends Request, BaseAuthenticatedRequest {}