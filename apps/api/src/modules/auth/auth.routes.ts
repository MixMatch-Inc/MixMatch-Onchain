import { Router } from 'express';
import { asyncHandler } from '../../shared/middleware/async-handler.js';
import { requireAuth, type AuthenticatedRequest } from '../../shared/middleware/auth.middleware.js';
import { PrismaUserRepository } from '../users/users.repository.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
export function createAuthRouter(): Router {
  const authService = new AuthService(new PrismaUserRepository());
import { InMemorySessionStore } from './session.store.js';
import { SessionService } from './session.service.js';
import { UserRole } from '@mixmatch/shared';
import { allowOwnership, requireRole } from './auth.guard.js';

export function createAuthRouter(): Router {
  const sessionStore = new InMemorySessionStore();
  const sessionService = new SessionService(sessionStore);
  const authService = new AuthService(new PrismaUserRepository(), sessionService);
  const controller = new AuthController(authService);

  const router = Router();
  router.post('/register', asyncHandler(controller.register));
  router.post('/login', asyncHandler(controller.login));
  router.get('/me', requireAuth, asyncHandler<AuthenticatedRequest>(controller.me));
<<<<<<< HEAD
=======
  router.post('/refresh', asyncHandler(controller.refresh));
  router.put('/profile/:id', requireAuth, allowOwnership, asyncHandler<AuthenticatedRequest>(controller.updateProfile));

  router.get(
    '/admin/users',
    requireAuth,
    requireRole(UserRole.ADMIN),
    asyncHandler(async (_req: AuthenticatedRequest, res) => {
      res.status(200).json({ users: [] });
    }),
  );
>>>>>>> pr647/feat/phertyameen-issues

  return router;
}
