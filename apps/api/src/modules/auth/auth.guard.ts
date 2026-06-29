import type { NextFunction, Response } from 'express';
import { ValidationError } from '../../shared/errors/AppError.js';
import { InsufficientPermissionsError } from '../../shared/errors/AuthErrors.js';
import type { UserRole, AuthenticatedRequest } from './auth.guard.types.js';

export function requireRole(role: UserRole) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.userId) {
      throw new InsufficientPermissionsError('Authentication required');
    }
    if (req.role !== role) {
      throw new InsufficientPermissionsError('Insufficient permissions');
    }
    next();
  };
}

export function allowOwnership(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  if (!req.userId) {
    throw new InsufficientPermissionsError('Authentication required');
  }
  if (!req.params.id) {
    throw new ValidationError('Missing resource id');
  }
  if (req.params.id !== req.userId) {
    throw new InsufficientPermissionsError('You do not have access to this resource');
  }
  next();
}
