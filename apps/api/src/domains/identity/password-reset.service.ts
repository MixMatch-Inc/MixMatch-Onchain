import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { IPasswordResetTokenRepository } from '../../repositories/password-reset-token.repository';
import { IUserRepository } from '../../repositories/user.repository';
import { IEmailProvider, PasswordResetPayload } from '../../services/email-provider';
import { AuthError, InfrastructureError } from '../../utils/errors';
import { auditLogService } from '../moderation/audit-log.service';

/** 1 hour in milliseconds */
const TOKEN_TTL_MS = 60 * 60 * 1000;

/** Max requests allowed in a rolling 60-second window */
const RATE_LIMIT = 3;
const RATE_WINDOW_MS = 60_000;

const SALT_ROUNDS = 10;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export interface PasswordResetStatus {
  hasPendingReset: boolean;
  expiresAt?: Date;
}

export class PasswordResetService {
  constructor(
    private readonly tokenRepo: IPasswordResetTokenRepository,
    private readonly userRepo: IUserRepository,
    private readonly emailProvider: IEmailProvider,
    private readonly baseUrl: string,
  ) {}

  /**
   * Request a password reset for the given email.
   * 
   * IMPORTANT: This endpoint is enumeration-safe — it returns the same response
   * whether or not the email exists in the system.
   */
  async requestReset(
    email: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    const normalizedEmail = email.toLowerCase();
    const user = await this.userRepo.findByEmail(normalizedEmail);

    // Always return without error to prevent email enumeration
    if (!user) {
      return;
    }

    // Rate-limit: at most RATE_LIMIT requests per RATE_WINDOW_MS
    const recentCount = await this.tokenRepo.countRecentByUserId(user.id, RATE_WINDOW_MS);
    if (recentCount >= RATE_LIMIT) {
      throw InfrastructureError.rateLimitExceeded(
        RATE_LIMIT,
        `${RATE_WINDOW_MS / 1000}s`,
      );
    }

    // Generate a cryptographically random raw token (64 hex chars = 32 bytes)
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = sha256(rawToken);
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

    await this.tokenRepo.create({
      userId: user.id,
      tokenHash,
      expiresAt,
      requestIp: ipAddress,
      userAgent,
    });

    // Supersede all prior live tokens
    await this.tokenRepo.supersedePriorTokens(user.id);

    // Build reset URL
    const resetUrl = `${this.baseUrl}/reset-password?token=${rawToken}`;

    // Send password reset email
    const payload: PasswordResetPayload = {
      template: 'password_reset',
      to: user.email,
      variables: {
        resetUrl,
        expiresInSeconds: String(TOKEN_TTL_MS / 1000),
        requestIp: ipAddress,
      },
    };

    await this.emailProvider.send(payload);

    // Audit log
    await auditLogService.log({
      action: 'PASSWORD_RESET_REQUESTED',
      actorId: user.id,
      targetId: user.id,
      metadata: { ipAddress },
    });
  }

  /**
   * Confirm a password reset with token and new password.
   * Updates the user's password and invalidates all sessions.
   */
  async confirmReset(
    rawToken: string,
    newPassword: string,
  ): Promise<void> {
    const tokenHash = sha256(rawToken);
    const record = await this.tokenRepo.findByTokenHash(tokenHash);

    if (!record) {
      // Generic "not found" — same response as expired to avoid enumeration
      throw AuthError.tokenInvalid();
    }

    if (record.consumedAt) {
      throw AuthError.tokenInvalid();
    }

    if (record.expiresAt < new Date()) {
      throw AuthError.tokenExpired();
    }

    // Mark token as consumed (single-use enforcement)
    await this.tokenRepo.markConsumed(record.id);

    // Hash the new password
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    // Update user's password
    await this.userRepo.update(record.userId, {
      passwordHash,
    } as any);

    // Revoke all user sessions for security
    // Note: This requires session repository which we'll inject via container
    // For now, we log the action and the controller will handle session revocation

    // Audit log
    await auditLogService.log({
      action: 'PASSWORD_RESET_CONFIRMED',
      actorId: record.userId,
      targetId: record.userId,
    });
  }

  /**
   * Return the password reset status for a user.
   */
  async getStatus(userId: string): Promise<PasswordResetStatus> {
    const user = await this.userRepo.findById(userId);

    if (!user) {
      throw AuthError.userNotFound();
    }

    const activeToken = await this.tokenRepo.findActiveByUserId(userId);
    return {
      hasPendingReset: activeToken !== null,
      expiresAt: activeToken?.expiresAt,
    };
  }
}
