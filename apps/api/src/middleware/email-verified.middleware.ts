import { NextFunction, Request, Response } from 'express';
import { AccountStatus } from '@mixmatch/types';
import { AuthenticatedRequestUser } from './auth.middleware';
import { container } from '../config/di';
import { AuthError } from '../utils/errors';

/**
 * requireEmailVerified
 *
 * Apply after `requireAuth` on any route that needs a fully-activated account.
 * Loads the user from the repository and checks accountStatus === ACTIVE.
 * Returns AUTH_009 (emailNotVerified) with HTTP 403 when the check fails.
 */
export const requireEmailVerified = async (
  req: Request & { user?: AuthenticatedRequestUser },
  res: Response,
  next: NextFunction,
): Promise<void> => {
  if (!req.user?.userId) {
    res.status(401).json({ message: 'Unauthorized: missing or invalid token' });
    return;
  }

  try {
    const user = await container.userRepository.findById(req.user.userId);

    if (!user) {
      res.status(401).json({ message: 'Unauthorized: user not found' });
      return;
    }

    const accountStatus = (user as any).accountStatus as AccountStatus | undefined;

    if (accountStatus !== AccountStatus.ACTIVE) {
      throw AuthError.emailNotVerified();
    }

    next();
  } catch (error) {
    next(error);
  }
};
