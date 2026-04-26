import { Request, Response } from 'express';
import { container } from '../../config/di';
import { emailService } from '../../services/email.service';
import { EmailVerificationService } from './email-verification.service';
import { confirmTokenSchema } from './auth.validation';
import { AuthenticatedRequestUser } from '../../middleware/auth.middleware';
import { sendSuccess } from '../../utils/api-response';
import { ValidationError } from '../../utils/errors';

/** Lazily constructed so tests can override container entries before first call. */
function buildService(): EmailVerificationService {
  return new EmailVerificationService(
    container.emailVerificationTokenRepository,
    container.userRepository,
    emailService,
  );
}

/**
 * POST /auth/verify/request
 *
 * Authenticated — issues (or re-issues) a verification token for the caller.
 * Rate-limited to 3 requests per 60-second window per user.
 */
export const requestVerification = async (
  req: Request & { user?: AuthenticatedRequestUser },
  res: Response,
): Promise<void> => {
  if (!req.user?.userId) {
    res.status(401).json({ message: 'Unauthorized: missing or invalid token' });
    return;
  }

  const user = await container.userRepository.findById(req.user.userId);
  if (!user) {
    res.status(404).json({ message: 'User not found' });
    return;
  }

  const service = buildService();
  await service.issueToken(
    req.user.userId,
    user.email,
    req.ip,
    req.headers['user-agent'],
  );

  sendSuccess(res, 202, {
    message: 'Verification email sent. Please check your inbox.',
  });
};

/**
 * GET /auth/verify/confirm?token=<hex>
 *
 * Public — validates and consumes the raw token from the email link.
 * Activates the user account on success.
 */
export const confirmVerification = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const parsed = confirmTokenSchema.safeParse({ token: req.query['token'] });

  if (!parsed.success) {
    throw ValidationError.invalidInput('token', req.query['token'], 'Invalid token format');
  }

  const service = buildService();
  await service.confirmToken(parsed.data.token);

  sendSuccess(res, 200, {
    message: 'Email verified successfully. Your account is now active.',
  });
};

/**
 * GET /auth/verify/status
 *
 * Authenticated — returns the verification status of the calling user.
 */
export const verificationStatus = async (
  req: Request & { user?: AuthenticatedRequestUser },
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
