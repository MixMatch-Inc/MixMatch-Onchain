import { Router } from 'express';
import { login, register, updateOnboardingStatus, me, session } from './auth.controller';
import { requireAuth } from '../../middleware/auth.middleware';

const authRouter = Router();

authRouter.post('/register', register);
authRouter.post('/login', login);
authRouter.get('/me', requireAuth, me);
authRouter.get('/session', requireAuth, session);
authRouter.patch('/onboarding', requireAuth, updateOnboardingStatus);

// ── Email Verification ───────────────────────────────────────────────────────
// POST /auth/verify/request  — issue / re-issue a token (rate-limited)
authRouter.post('/verify/request', requireAuth, requestVerification);
// GET  /auth/verify/confirm?token=<hex>  — consume token, activate account
authRouter.get('/verify/confirm', confirmVerification);
// GET  /auth/verify/status  — check current verification state
authRouter.get('/verify/status', requireAuth, verificationStatus);

export default authRouter;

