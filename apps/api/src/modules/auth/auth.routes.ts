import { Router } from 'express';
import { login, register, updateOnboardingStatus, me } from './auth.controller';
import { requireAuth } from '../../middleware/auth.middleware';

const authRouter = Router();

authRouter.post('/register', register);
authRouter.post('/login', login);
authRouter.get('/me', requireAuth, me);
authRouter.patch('/onboarding', requireAuth, updateOnboardingStatus);

export default authRouter;
