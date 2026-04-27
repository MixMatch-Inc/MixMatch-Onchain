/**
 * Email delivery abstraction for auth and onboarding notifications.
 *
 * Provider-agnostic mailer interface that prevents email provider coupling
 * from leaking into auth services. Includes typed template payload contracts
 * and mock adapter support for tests.
 */

// ---------------------------------------------------------------------------
// Template payload contracts
// ---------------------------------------------------------------------------

export interface EmailTemplatePayload {
  template: EmailTemplateName;
  to: string;
  variables: Record<string, string>;
}

export type EmailTemplateName =
  | 'email_verification'
  | 'welcome'
  | 'password_reset'
  | 'suspicious_login'
  | 'account_restriction';

export interface EmailVerificationPayload extends EmailTemplatePayload {
  template: 'email_verification';
  variables: {
    verificationUrl: string;
    token?: string;
    expiresInSeconds: string;
  };
}

export interface WelcomePayload extends EmailTemplatePayload {
  template: 'welcome';
  variables: {
    userName: string;
    loginUrl: string;
  };
}

export interface PasswordResetPayload extends EmailTemplatePayload {
  template: 'password_reset';
  variables: {
    resetUrl: string;
    token?: string;
    expiresInSeconds: string;
    requestIp?: string;
  };
}

export interface SuspiciousLoginPayload extends EmailTemplatePayload {
  template: 'suspicious_login';
  variables: {
    loginIp: string;
    loginLocation?: string;
    loginTime: string;
    deviceInfo?: string;
    secureAccountUrl: string;
  };
}

export interface AccountRestrictionPayload extends EmailTemplatePayload {
  template: 'account_restriction';
  variables: {
    reason?: string;
    appealUrl?: string;
    supportEmail: string;
  };
}

export type AnyEmailPayload =
  | EmailVerificationPayload
  | WelcomePayload
  | PasswordResetPayload
  | SuspiciousLoginPayload
  | AccountRestrictionPayload;

// ---------------------------------------------------------------------------
// Error taxonomy
// ---------------------------------------------------------------------------

export class EmailDeliveryError extends Error {
  constructor(
    message: string,
    public readonly code: EmailErrorCode,
    public readonly originalError?: Error,
  ) {
    super(message);
    this.name = 'EmailDeliveryError';
  }

  static providerUnavailable(provider: string, originalError?: Error) {
    return new EmailDeliveryError(
      `Email provider '${provider}' is unavailable`,
      EmailErrorCode.PROVIDER_UNAVAILABLE,
      originalError,
    );
  }

  static deliveryFailed(reason: string, originalError?: Error) {
    return new EmailDeliveryError(
      `Email delivery failed: ${reason}`,
      EmailErrorCode.DELIVERY_FAILED,
      originalError,
    );
  }

  static invalidRecipient(recipient: string) {
    return new EmailDeliveryError(
      `Invalid email recipient: ${recipient}`,
      EmailErrorCode.INVALID_RECIPIENT,
    );
  }
}

export enum EmailErrorCode {
  PROVIDER_UNAVAILABLE = 'PROVIDER_UNAVAILABLE',
  DELIVERY_FAILED = 'DELIVERY_FAILED',
  INVALID_RECIPIENT = 'INVALID_RECIPIENT',
  TEMPLATE_NOT_FOUND = 'TEMPLATE_NOT_FOUND',
}

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

export interface IEmailProvider {
  /**
   * Send an email using a typed template payload.
   * Provider implementations handle template rendering and delivery.
   */
  send(payload: AnyEmailPayload): Promise<void>;

  /**
   * Health check for the email provider.
   * Returns true if the provider is operational.
   */
  isHealthy(): Promise<boolean>;
}

// ---------------------------------------------------------------------------
// Mock adapter for tests
// ---------------------------------------------------------------------------

export class MockEmailProvider implements IEmailProvider {
  public sentEmails: AnyEmailPayload[] = [];

  async send(payload: AnyEmailPayload): Promise<void> {
    this.sentEmails.push(payload);
  }

  async isHealthy(): Promise<boolean> {
    return true;
  }

  /** Clear captured emails (useful between test cases) */
  clear(): void {
    this.sentEmails = [];
  }

  /** Get the most recently sent email for a specific template */
  findLast(template: EmailTemplateName): AnyEmailPayload | undefined {
    return [...this.sentEmails].reverse().find((e) => e.template === template);
  }
}
