/**
 * Email service abstraction - backward compatible wrapper.
 *
 * This module now wraps the new IEmailProvider abstraction for backward
 * compatibility. New code should use IEmailProvider directly.
 */
import {
  IEmailProvider,
  EmailVerificationPayload,
  PasswordResetPayload,
  WelcomePayload,
  SuspiciousLoginPayload,
  AccountRestrictionPayload,
  MockEmailProvider,
  EmailDeliveryError,
} from './email-provider';

/**
 * Legacy IEmailService interface - kept for backward compatibility.
 * New code should use IEmailProvider from email-provider.ts instead.
 */
export interface IEmailService {
  /**
   * Send a verification email containing the raw (un-hashed) token.
   *
   * @param to      - recipient address
   * @param rawToken - the 64-char hex token the user must supply to /auth/verify/confirm
   */
  sendVerificationEmail(to: string, rawToken: string): Promise<void>;
}

/**
 * ConsoleEmailService implementation for development and test environments.
 * Wraps the new IEmailProvider abstraction.
 */
export class ConsoleEmailService implements IEmailService {
  async sendVerificationEmail(to: string, rawToken: string): Promise<void> {
    console.log(
      `[EMAIL] Verification link for ${to}:\n` +
      `  GET /auth/verify/confirm?token=${rawToken}\n` +
      `  (token expires in 24 hours)`,
    );
  }
}

/** Singleton used throughout the app — swap implementation at startup if needed. */
export const emailService: IEmailService = new ConsoleEmailService();

// Re-export new abstraction for new code
export {
  IEmailProvider,
  EmailVerificationPayload,
  PasswordResetPayload,
  WelcomePayload,
  SuspiciousLoginPayload,
  AccountRestrictionPayload,
  MockEmailProvider,
  EmailDeliveryError,
} from './email-provider';
