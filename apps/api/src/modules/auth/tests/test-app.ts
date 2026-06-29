import cors from 'cors';
import express, { type Express, Router } from 'express';
import { asyncHandler } from '../../../shared/middleware/async-handler.js';
import { errorMiddleware } from '../../../shared/middleware/error.middleware.js';
import { requireAuth, type AuthenticatedRequest } from '../../../shared/middleware/auth.middleware.js';
import { InMemoryUserRepository } from '../../users/users.repository.js';
import { AuthController } from '../auth.controller.js';
import { AuthService } from '../auth.service.js';
/**
 * Builds an isolated Express app wired to an in-memory user repository,
 * so the auth module's tests run without a database connection.
 */
export function createTestApp(): Express {
  const authService = new AuthService(new InMemoryUserRepository());
import { InMemorySessionStore } from '../session.store.js';
import { SessionService } from '../session.service.js';
import { allowOwnership, requireRole } from '../auth.guard.js';
import { UserRole } from '../auth.guard.types.js';

export function createTestApp(): Express {
  const sessionStore = new InMemorySessionStore();
  const sessionService = new SessionService(sessionStore);
  const authService = new AuthService(new InMemoryUserRepository(), sessionService);
  const controller = new AuthController(authService);

  const router = Router();
  router.post('/register', asyncHandler(controller.register));
  router.post('/login', asyncHandler(controller.login));
  router.get('/me', requireAuth, asyncHandler<AuthenticatedRequest>(controller.me));
<<<<<<< HEAD
=======
  router.post('/refresh', asyncHandler(controller.refresh));
  router.put('/profile/:id', requireAuth, allowOwnership, asyncHandler<AuthenticatedRequest>(controller.updateProfile));
  router.get('/admin', requireAuth, requireRole(UserRole.ADMIN), asyncHandler<AuthenticatedRequest>(async (_req, res) => {
    res.status(200).json({ ok: true });
  }));
>>>>>>> pr647/feat/phertyameen-issues

  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api/auth', router);
  app.use(errorMiddleware);

  return app;
}
