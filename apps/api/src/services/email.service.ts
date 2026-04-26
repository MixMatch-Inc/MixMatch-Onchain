/**
 * Email service abstraction.
 *
 * The ConsoleEmailService is used in development and test environments.
 * In production, replace this with a concrete implementation that calls
 * an SMTP relay or transactional email provider (e.g. Resend, SendGrid).
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
