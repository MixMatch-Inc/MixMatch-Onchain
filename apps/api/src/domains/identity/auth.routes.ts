import { Router } from 'express';
import { login, register, updateOnboardingStatus, me, logout, logoutAll } from './auth.controller';
import { requireAuth } from '../../middleware/auth.middleware';

const authRouter = Router();

authRouter.post('/register', register);
authRouter.post('/login', login);
authRouter.get('/me', requireAuth, me);
authRouter.patch('/onboarding', requireAuth, updateOnboardingStatus);
authRouter.post('/logout', requireAuth, logout);
authRouter.post('/logout-all', requireAuth, logoutAll);

export default authRouter;
