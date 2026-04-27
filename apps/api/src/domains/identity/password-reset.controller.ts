import { Request, Response } from 'express';
import { container } from '../../config/di';
import { IEmailProvider } from '../../services/email-provider';
import { ConsoleEmailProvider } from '../../services/console-email-provider';
import { PasswordResetService } from './password-reset.service';
import { passwordResetRequestSchema, passwordResetConfirmSchema } from './auth.validation';
import { sendSuccess } from '../../utils/api-response';
import { ValidationError } from '../../utils/errors';
import { apiEnv } from '../../config/env';

/** Lazily constructed so tests can override container entries before first call. */
function buildService(): PasswordResetService {
  // Use the email provider from DI or fallback to console provider
  const emailProvider = (container as any).emailProvider as IEmailProvider | undefined;
  
  return new PasswordResetService(
    container.passwordResetTokenRepository,
    container.userRepository,
    emailProvider || new ConsoleEmailProvider(),
    apiEnv.corsOrigin || 'http://localhost:3000',
  );
}

/**
 * POST /auth/password-reset/request
 *
 * Public — requests a password reset email for the given address.
 * Enumeration-safe: returns 202 whether or not the email exists.
 * Rate-limited to 3 requests per 60-second window per user.
 */
export const requestPasswordReset = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const parsed = passwordResetRequestSchema.safeParse(req.body);

  if (!parsed.success) {
    throw ValidationError.invalidInput('body', req.body, 'Validation failed');
  }

  const { email } = parsed.data;
  const service = buildService();

  await service.requestReset(email, req.ip, req.headers['user-agent']);

  // Always return 202 with neutral message to prevent email enumeration
  sendSuccess(res, 202, {
    message: 'If an account with that email exists, we have sent a password reset link.',
  });
};

/**
 * POST /auth/password-reset/confirm
 *
 * Public — confirms a password reset with token and new password.
 * Updates password and prepares for session invalidation.
 */
export const confirmPasswordReset = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const parsed = passwordResetConfirmSchema.safeParse(req.body);

  if (!parsed.success) {
    throw ValidationError.invalidInput('body', req.body, 'Validation failed');
  }

  const { token, newPassword } = parsed.data;
  const service = buildService();

  await service.confirmReset(token, newPassword);

  sendSuccess(res, 200, {
    message: 'Password reset successfully. You can now log in with your new password.',
  });
};

/**
 * GET /auth/password-reset/status
 *
 * Authenticated — returns the password reset status of the calling user.
 */
export const passwordResetStatus = async (
  req: Request & { user?: any },
  res: Response,
): Promise<void> => {
  if (!req.user?.userId) {
    res.status(401).json({ message: 'Unauthorized: missing or invalid token' });
    return;
  }

  const service = buildService();
  const status = await service.getStatus(req.user.userId);

  sendSuccess(res, 200, status);
};
