import { Router } from 'express';
import { login, register, updateOnboardingStatus, me, session, logout, logoutAll } from './auth.controller';
import { requestVerification, confirmVerification, verificationStatus } from './email-verification.controller';
import { requestPasswordReset, confirmPasswordReset, passwordResetStatus } from './password-reset.controller';
import { requireAuth } from '../../middleware/auth.middleware';

// Explicit type annotation to satisfy TypeScript's portability check
const authRouter: ReturnType<typeof Router> = Router();

authRouter.post('/register', register);
authRouter.post('/login', login);
authRouter.get('/me', requireAuth, me);
authRouter.get('/session', requireAuth, session);
authRouter.patch('/onboarding', requireAuth, updateOnboardingStatus);
authRouter.post('/logout', requireAuth, logout);
authRouter.post('/logout-all', requireAuth, logoutAll);

// ── Email Verification ───────────────────────────────────────────────────────
// POST /auth/verify/request  — issue / re-issue a token (rate-limited)
authRouter.post('/verify/request', requireAuth, requestVerification);
// GET  /auth/verify/confirm?token=<hex>  — consume token, activate account
authRouter.get('/verify/confirm', confirmVerification);
// GET  /auth/verify/status  — check current verification state
authRouter.get('/verify/status', requireAuth, verificationStatus);

// ── Password Reset ───────────────────────────────────────────────────────────
// POST /auth/password-reset/request  — request password reset email (enumeration-safe)
authRouter.post('/password-reset/request', requestPasswordReset);
// POST /auth/password-reset/confirm  — confirm reset with token and new password
authRouter.post('/password-reset/confirm', confirmPasswordReset);
// GET  /auth/password-reset/status  — check reset status (authenticated)
authRouter.get('/password-reset/status', requireAuth, passwordResetStatus);

export default authRouter;

