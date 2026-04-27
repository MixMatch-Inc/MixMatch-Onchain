/**
 * Transactional email templates for account lifecycle flows.
 *
 * Templates are structured with copy tokens so branding and localization
 * can evolve later. Each template exports a render function that returns
 * subject and HTML body.
 */

import {
  EmailVerificationPayload,
  WelcomePayload,
  PasswordResetPayload,
  SuspiciousLoginPayload,
  AccountRestrictionPayload,
} from './email-provider';

// ---------------------------------------------------------------------------
// Template: Email Verification
// ---------------------------------------------------------------------------

export function renderEmailVerification(payload: EmailVerificationPayload): {
  subject: string;
  html: string;
  text: string;
} {
  const { verificationUrl, expiresInSeconds } = payload.variables;
  const expiresHours = Math.floor(Number(expiresInSeconds) / 3600);

  return {
    subject: 'Verify your MixMatch account',
    html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #333;">Verify Your Email</h1>
        <p>Hi there,</p>
        <p>Thanks for joining MixMatch! Please verify your email address by clicking the button below:</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" 
             style="background-color: #6C63FF; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Verify Email Address
          </a>
        </p>
        <p style="color: #666; font-size: 14px;">
          This link will expire in ${expiresHours} hours. If you didn't create a MixMatch account, you can safely ignore this email.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
        <p style="color: #999; font-size: 12px;">
          If the button doesn't work, copy and paste this link into your browser:<br />
          <a href="${verificationUrl}">${verificationUrl}</a>
        </p>
      </body>
      </html>
    `,
    text: `
Verify Your Email
=================

Hi there,

Thanks for joining MixMatch! Please verify your email address by visiting this link:
${verificationUrl}

This link will expire in ${expiresHours} hours. If you didn't create a MixMatch account, you can safely ignore this email.
    `.trim(),
  };
}

// ---------------------------------------------------------------------------
// Template: Welcome
// ---------------------------------------------------------------------------

export function renderWelcome(payload: WelcomePayload): {
  subject: string;
  html: string;
  text: string;
} {
  const { userName, loginUrl } = payload.variables;

  return {
    subject: 'Welcome to MixMatch!',
    html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #333;">Welcome to MixMatch, ${userName}!</h1>
        <p>We're thrilled to have you on board. MixMatch connects music lovers, DJs, and event planners in a whole new way.</p>
        <h2 style="color: #6C63FF;">What's Next?</h2>
        <ul>
          <li>Complete your profile to get personalized recommendations</li>
          <li>Explore DJs and events in your area</li>
          <li>Start building your music taste profile</li>
        </ul>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${loginUrl}" 
             style="background-color: #6C63FF; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Get Started
          </a>
        </p>
        <p style="color: #666; font-size: 14px;">
          If you have any questions, our support team is here to help.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
        <p style="color: #999; font-size: 12px;">
          Cheers,<br />
          The MixMatch Team
        </p>
      </body>
      </html>
    `,
    text: `
Welcome to MixMatch, ${userName}!
==================================

We're thrilled to have you on board. MixMatch connects music lovers, DJs, and event planners in a whole new way.

What's Next?
- Complete your profile to get personalized recommendations
- Explore DJs and events in your area
- Start building your music taste profile

Get started here: ${loginUrl}

If you have any questions, our support team is here to help.

Cheers,
The MixMatch Team
    `.trim(),
  };
}

// ---------------------------------------------------------------------------
// Template: Password Reset
// ---------------------------------------------------------------------------

export function renderPasswordReset(payload: PasswordResetPayload): {
  subject: string;
  html: string;
  text: string;
} {
  const { resetUrl, expiresInSeconds, requestIp } = payload.variables;
  const expiresMinutes = Math.floor(Number(expiresInSeconds) / 60);

  return {
    subject: 'Reset your MixMatch password',
    html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #333;">Reset Your Password</h1>
        <p>We received a request to reset your password. Click the button below to create a new password:</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" 
             style="background-color: #6C63FF; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Reset Password
          </a>
        </p>
        <p style="color: #666; font-size: 14px;">
          This link will expire in ${expiresMinutes} minutes. If you didn't request a password reset, you can safely ignore this email.
        </p>
        ${requestIp ? `<p style="color: #666; font-size: 14px;"><strong>Request details:</strong><br />IP Address: ${requestIp}</p>` : ''}
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
        <p style="color: #999; font-size: 12px;">
          If the button doesn't work, copy and paste this link into your browser:<br />
          <a href="${resetUrl}">${resetUrl}</a>
        </p>
      </body>
      </html>
    `,
    text: `
Reset Your Password
===================

We received a request to reset your password. Visit this link to create a new password:
${resetUrl}

This link will expire in ${expiresMinutes} minutes. If you didn't request a password reset, you can safely ignore this email.
${requestIp ? `\nRequest details:\nIP Address: ${requestIp}` : ''}
    `.trim(),
  };
}

// ---------------------------------------------------------------------------
// Template: Suspicious Login Alert
// ---------------------------------------------------------------------------

export function renderSuspiciousLogin(payload: SuspiciousLoginPayload): {
  subject: string;
  html: string;
  text: string;
} {
  const { loginIp, loginLocation, loginTime, deviceInfo, secureAccountUrl } =
    payload.variables;

  return {
    subject: 'Security alert: Unusual login activity detected',
    html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #FF6B6B;">Security Alert</h1>
        <p>We detected a login to your MixMatch account from an unusual location or device.</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h2 style="color: #333; margin-top: 0;">Login Details</h2>
          <p><strong>IP Address:</strong> ${loginIp}</p>
          ${loginLocation ? `<p><strong>Location:</strong> ${loginLocation}</p>` : ''}
          <p><strong>Time:</strong> ${loginTime}</p>
          ${deviceInfo ? `<p><strong>Device:</strong> ${deviceInfo}</p>` : ''}
        </div>

        <p>If this was you, you can safely ignore this email.</p>
        <p>If you don't recognize this activity, please secure your account immediately:</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${secureAccountUrl}" 
             style="background-color: #FF6B6B; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Secure Your Account
          </a>
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
        <p style="color: #999; font-size: 12px;">
          For your security, we recommend enabling two-factor authentication in your account settings.
        </p>
      </body>
      </html>
    `,
    text: `
Security Alert: Unusual Login Activity
=======================================

We detected a login to your MixMatch account from an unusual location or device.

Login Details:
- IP Address: ${loginIp}
${loginLocation ? `- Location: ${loginLocation}` : ''}
- Time: ${loginTime}
${deviceInfo ? `- Device: ${deviceInfo}` : ''}

If this was you, you can safely ignore this email.

If you don't recognize this activity, please secure your account immediately:
${secureAccountUrl}

For your security, we recommend enabling two-factor authentication in your account settings.
    `.trim(),
  };
}

// ---------------------------------------------------------------------------
// Template: Account Restriction Notification
// ---------------------------------------------------------------------------

export function renderAccountRestriction(payload: AccountRestrictionPayload): {
  subject: string;
  html: string;
  text: string;
} {
  const { reason, appealUrl, supportEmail } = payload.variables;

  return {
    subject: 'Important: Your MixMatch account status',
    html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #FFA500;">Account Status Update</h1>
        <p>We're writing to inform you about a change to your MixMatch account status.</p>
        
        ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
        
        <p>Your account access has been restricted to ensure the safety and integrity of our community. We take these decisions carefully and in accordance with our community guidelines.</p>
        
        <h2 style="color: #333;">What You Can Do</h2>
        <ul>
          <li>Review our community guidelines to understand our policies</li>
          ${appealUrl ? `<li>If you believe this is an error, you can <a href="${appealUrl}">submit an appeal</a></li>` : ''}
          <li>Contact our support team at <a href="mailto:${supportEmail}">${supportEmail}</a></li>
        </ul>

        <p>We value your presence on MixMatch and hope to resolve this matter quickly.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
        <p style="color: #999; font-size: 12px;">
          MixMatch Trust & Safety Team
        </p>
      </body>
      </html>
    `,
    text: `
Account Status Update
=====================

We're writing to inform you about a change to your MixMatch account status.
${reason ? `\nReason: ${reason}` : ''}

Your account access has been restricted to ensure the safety and integrity of our community. We take these decisions carefully and in accordance with our community guidelines.

What You Can Do:
- Review our community guidelines to understand our policies
${appealUrl ? `- If you believe this is an error, you can submit an appeal: ${appealUrl}` : ''}
- Contact our support team at ${supportEmail}

We value your presence on MixMatch and hope to resolve this matter quickly.

MixMatch Trust & Safety Team
    `.trim(),
  };
}

// ---------------------------------------------------------------------------
// Template registry
// ---------------------------------------------------------------------------

export interface TemplateRenderer {
  subject: string;
  html: string;
  text: string;
}

export type RenderFunction = (payload: any) => TemplateRenderer;

export const templateRegistry: Record<string, RenderFunction> = {
  email_verification: renderEmailVerification,
  welcome: renderWelcome,
  password_reset: renderPasswordReset,
  suspicious_login: renderSuspiciousLogin,
  account_restriction: renderAccountRestriction,
};

/**
 * Render a template by name with the given payload.
 * Throws if template name is not found.
 */
export function renderTemplate(
  templateName: string,
  payload: any,
): TemplateRenderer {
  const renderer = templateRegistry[templateName];
  if (!renderer) {
    throw new Error(`Email template '${templateName}' not found`);
  }
  return renderer(payload);
}
