import crypto from 'crypto';
import { AccountStatus, EmailVerificationEvent, EmailVerificationEventType } from '@mixmatch/types';
import { IEmailVerificationTokenRepository } from '../../repositories/email-verification-token.repository';
import { IUserRepository } from '../../repositories/user.repository';
import { IEmailService } from '../../services/email.service';
import { AuthError } from '../../utils/errors';
import { InfrastructureError } from '../../utils/errors';

/** 24 hours in milliseconds */
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

/** Max resends allowed in a rolling 60-second window */
const RESEND_RATE_LIMIT = 3;
const RESEND_WINDOW_MS = 60_000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

function buildEvent(
  type: EmailVerificationEventType,
  userId: string,
  tokenId: string,
  metadata?: Record<string, unknown>,
): EmailVerificationEvent {
  return {
    type,
    userId,
    tokenId,
    occurredAt: new Date().toISOString(),
    metadata,
  };
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export interface VerificationStatus {
  verified: boolean;
  pendingToken: boolean;
  expiresAt?: Date;
}

export class EmailVerificationService {
  constructor(
    private readonly tokenRepo: IEmailVerificationTokenRepository,
    private readonly userRepo: IUserRepository,
    private readonly emailService: IEmailService,
    /** Optional event bus callback — fire-and-forget, never throws */
    private readonly emitEvent: (event: EmailVerificationEvent) => void = () => {},
  ) {}

  /**
   * Issue a new verification token for `userId` / `email`.
   * Enforces a resend rate-limit and supersedes all prior live tokens.
   */
  async issueToken(
    userId: string,
    email: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    // Rate-limit: at most RESEND_RATE_LIMIT tokens per RESEND_WINDOW_MS
    const recentCount = await this.tokenRepo.countRecentByUserId(userId, RESEND_WINDOW_MS);
    if (recentCount >= RESEND_RATE_LIMIT) {
      throw InfrastructureError.rateLimitExceeded(
        RESEND_RATE_LIMIT,
        `${RESEND_WINDOW_MS / 1000}s`,
      );
    }

    // Determine resend lineage from any currently active token
    const priorToken = await this.tokenRepo.findActiveByUserId(userId);

    // Generate a cryptographically random raw token (64 hex chars = 32 bytes)
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = sha256(rawToken);
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

    const newToken = await this.tokenRepo.create({
      userId,
      tokenHash,
      expiresAt,
      resendLineage: priorToken?.id,
      resendCount: priorToken ? priorToken.resendCount + 1 : 0,
      ipAddress,
      userAgent,
    });

    // Supersede all prior live tokens (except the one we just created)
    await this.tokenRepo.supersedePriorTokens(userId, newToken.id);

    // Deliver the email (stubbed in dev/test)
    await this.emailService.sendVerificationEmail(email, rawToken);

    this.emitEvent(
      buildEvent(EmailVerificationEventType.ISSUED, userId, newToken.id, {
        resendCount: newToken.resendCount,
      }),
    );
  }

  /**
   * Validate and consume a raw verification token.
   * Activates the associated user's account on success.
   */
  async confirmToken(rawToken: string): Promise<void> {
    const tokenHash = sha256(rawToken);
    const record = await this.tokenRepo.findByTokenHash(tokenHash);

    if (!record) {
      // Generic "not found" — same response as expired to avoid enumeration
      throw AuthError.tokenInvalid();
    }

    if (record.consumedAt) {
      throw AuthError.verificationTokenAlreadyUsed();
    }

    if (record.supersededAt) {
      throw AuthError.tokenInvalid();
    }

    if (record.expiresAt < new Date()) {
      this.emitEvent(
        buildEvent(EmailVerificationEventType.EXPIRED, record.userId, record.id),
      );
      throw AuthError.tokenExpired();
    }

    // Mark token as consumed (single-use enforcement)
    await this.tokenRepo.markConsumed(record.id);

    // Activate the user account
    await this.userRepo.update(record.userId, {
      accountStatus: AccountStatus.ACTIVE,
    } as any);

    this.emitEvent(
      buildEvent(EmailVerificationEventType.CONFIRMED, record.userId, record.id),
    );
  }

  /**
   * Return the verification status for a user.
   */
  async getStatus(userId: string): Promise<VerificationStatus> {
    const user = await this.userRepo.findById(userId);

    if (!user) {
      throw AuthError.userNotFound();
    }

    const verified = (user as any).accountStatus === AccountStatus.ACTIVE;

    if (verified) {
      return { verified: true, pendingToken: false };
    }

    const activeToken = await this.tokenRepo.findActiveByUserId(userId);
    return {
      verified: false,
      pendingToken: activeToken !== null,
      expiresAt: activeToken?.expiresAt,
    };
  }
}
