import { Router } from 'express';
import { asyncHandler } from '../../shared/middleware/async-handler.js';
import { requireAuth, type AuthenticatedRequest } from '../../shared/middleware/auth.middleware.js';
import { PrismaUserRepository } from '../users/users.repository.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';

export function createAuthRouter(): Router {
  const authService = new AuthService(new PrismaUserRepository());
  const controller = new AuthController(authService);

  const router = Router();
  router.post('/register', asyncHandler(controller.register));
  router.post('/login', asyncHandler(controller.login));
  router.get('/me', requireAuth, asyncHandler<AuthenticatedRequest>(controller.me));

  return router;
}
