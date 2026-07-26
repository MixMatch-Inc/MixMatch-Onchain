import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, type AuthenticatedRequest } from '../../shared/middleware/auth.middleware.js';
import { asyncHandler } from '../../shared/middleware/async-handler.js';
import { PrismaUserRepository } from './users.repository.js';
import { AuthService } from '../auth/auth.service.js';
import { PrismaSessionStore } from '../auth/session.store.js';
import { SessionService } from '../auth/session.service.js';

export function createUserRouter(): Router {
  const prisma = new PrismaClient();
  const sessionStore = new PrismaSessionStore(prisma);
  const sessionService = new SessionService(sessionStore);
  const authService = new AuthService(new PrismaUserRepository(), sessionService);

  const router = Router();

  router.get('/me', requireAuth, asyncHandler<AuthenticatedRequest>(async (req, res) => {
    const user = await authService.getCurrentUser(req.userId!);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.status(200).json({ user });
  }));

  return router;
}
