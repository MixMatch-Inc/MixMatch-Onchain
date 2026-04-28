import { Router, Request, Response, NextFunction } from 'express';
import { login, register, updateOnboardingStatus, me, session, logout, logoutAll, changePassword, getOnboardingStatus } from './auth.controller';
import { requestVerification, confirmVerification, verificationStatus } from './email-verification.controller';
import { requestPasswordReset, confirmPasswordReset, passwordResetStatus } from './password-reset.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { authCooldownStore } from '../../services/auth-cooldown.service';
import { noOpRiskCheckService } from '../../services/risk-check.service';

// Explicit type annotation to satisfy TypeScript's portability check
const authRouter: ReturnType<typeof Router> = Router();

// ── Cooldown middleware factory ───────────────────────────────────────────────
function withCooldown(operation: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const identifier = (req.body?.email as string | undefined) ?? req.ip ?? 'unknown';
    const result = authCooldownStore.check(operation, identifier);
    if (!result.allowed) {
      res.set('Retry-After', String(result.retryAfterSeconds ?? 60));
      res.status(429).json({
        code: 'COOLDOWN_EXCEEDED',
        message: 'Too many attempts. Please try again later.',
        retryAfterSeconds: result.retryAfterSeconds,
      });
      return;
    }
    next();
  };
}

// ── Risk-check middleware factory ─────────────────────────────────────────────
function withRiskCheck(context: 'signup' | 'login' | 'reset' | 'verify') {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const token = req.body?.captchaToken as string | undefined;
    const result = await noOpRiskCheckService.assess(context, token, req.ip, req.headers['user-agent']);
    if (!result.allowed) {
      res.status(403).json({
        code: 'RISK_CHECK_FAILED',
        message: result.reason ?? 'Request blocked by risk assessment',
      });
      return;
    }
    next();
  };
}

// ── Routes ────────────────────────────────────────────────────────────────────
authRouter.post('/register', withRiskCheck('signup'), withCooldown('signup'), register);
authRouter.post('/login', withRiskCheck('login'), withCooldown('login'), login);
authRouter.get('/me', requireAuth, me);
authRouter.get('/session', requireAuth, session);
authRouter.get('/onboarding/status', requireAuth, getOnboardingStatus);
authRouter.patch('/onboarding', requireAuth, updateOnboardingStatus);
authRouter.post('/logout', requireAuth, logout);
authRouter.post('/logout-all', requireAuth, logoutAll);

// ── Password management ───────────────────────────────────────────────────────
authRouter.post('/change-password', requireAuth, changePassword);

// ── Email Verification ────────────────────────────────────────────────────────
// POST /auth/verify/request  — issue / re-issue a token (rate-limited)
authRouter.post('/verify/request', requireAuth, withCooldown('verify'), requestVerification);
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
