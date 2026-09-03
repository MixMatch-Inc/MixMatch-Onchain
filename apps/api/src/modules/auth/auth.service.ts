import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type {
  AuthTokenResponse,
  AuthUser,
  LoginInput,
  RegisterInput,
  RegisterResponse,
  VerifyEmailResponse,
} from '@mixmatch/shared';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { UsersRepository, type User } from '../users/users.repository';
import { EmailVerificationRepository } from './email-verification.repository';

/** Kept in step with `passwordSchema` in @mixmatch/shared. */
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;
/** 32 random bytes, hex-encoded — matches `verifyEmailSchema` in @mixmatch/shared. */
const VERIFICATION_TOKEN_BYTES = 32;

function toAuthUser(user: User): AuthUser {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    emailVerified: user.emailVerifiedAt !== null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

/**
 * #918: enforce password strength server-side as defense in depth.
 *
 * `registerSchema` already applies these bounds, but it is attached to one
 * controller route via `@UsePipes` — this is the check no caller can skip,
 * so the invariant holds for any future path into `register` (a seed
 * script, an admin-created account) that doesn't go through that pipe.
 *
 * Deliberately mirrors the shared schema rather than adding composition
 * rules on top: the two must agree, or the API would reject passwords its
 * own published contract says are valid. Tighten both together.
 */
function assertPasswordStrength(password: string): void {
  if (password.length < PASSWORD_MIN_LENGTH) {
    throw new BadRequestException(
      `Password must be at least ${PASSWORD_MIN_LENGTH} characters long`,
    );
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    throw new BadRequestException(
      `Password must not exceed ${PASSWORD_MAX_LENGTH} characters`,
    );
  }
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly emailVerificationRepository: EmailVerificationRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(input: RegisterInput): Promise<RegisterResponse> {
    assertPasswordStrength(input.password);

    const existing = await this.usersRepository.findByEmail(input.email);
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(
      input.password,
      this.bcryptSaltRounds(),
    );
    const user = await this.usersRepository.create({
      email: input.email,
      passwordHash,
    });

    if (!this.emailVerificationRequired()) {
      return this.buildTokenResponse(user);
    }

    // No access token is issued here: until the address is confirmed there
    // is no credential that can be used against the API at all, so the gate
    // holds without JwtAuthGuard having to hit the database per request.
    const verificationToken = await this.issueVerificationToken(user);
    return {
      user: toAuthUser(user),
      accessToken: null,
      ...(this.isProduction() ? {} : { verificationToken }),
    };
  }

  async login(input: LoginInput): Promise<AuthTokenResponse> {
    const user = await this.usersRepository.findByEmail(input.email);
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const matches = await bcrypt.compare(input.password, user.passwordHash);
    if (!matches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (this.emailVerificationRequired() && user.emailVerifiedAt === null) {
      throw new ForbiddenException(
        'Confirm your email address before signing in. ' +
          'Request a new link from /auth/resend-verification.',
      );
    }

    return this.buildTokenResponse(user);
  }

  /** Redeems a verification token, making the account usable. */
  async verifyEmail(token: string): Promise<VerifyEmailResponse> {
    const record = await this.emailVerificationRepository.findByTokenHash(
      hashToken(token),
    );

    // One message for every failure mode (unknown, expired, already spent)
    // so the endpoint can't be used to probe which tokens ever existed.
    if (
      !record ||
      record.consumedAt !== null ||
      record.expiresAt <= new Date()
    ) {
      throw new BadRequestException(
        'This verification link is invalid or has expired',
      );
    }

    if (!(await this.emailVerificationRepository.consume(record.id))) {
      throw new BadRequestException(
        'This verification link is invalid or has expired',
      );
    }

    const user = await this.usersRepository.markEmailVerified(record.userId);
    return { user: toAuthUser(user) };
  }

  /**
   * Issues a fresh verification link. Always resolves successfully, whether
   * or not the address exists or is already verified — the response must not
   * reveal which addresses have accounts.
   */
  async resendVerification(email: string): Promise<void> {
    const user = await this.usersRepository.findByEmail(email);
    if (!user || user.emailVerifiedAt !== null) {
      return;
    }
    await this.issueVerificationToken(user);
  }

  async getCurrentUser(userId: string): Promise<AuthUser | null> {
    const user = await this.usersRepository.findById(userId);
    return user ? toAuthUser(user) : null;
  }

  /**
   * Generates a token, stores only its hash, and hands the plaintext to the
   * (not yet built) mail transport.
   *
   * NOTE: there is no mail transport in this codebase yet, so the token is
   * logged outside production and otherwise goes nowhere. Wire an email
   * sender in here before turning EMAIL_VERIFICATION_REQUIRED on in a real
   * deployment, or users will have no way to receive their link.
   */
  private async issueVerificationToken(user: User): Promise<string> {
    await this.emailVerificationRepository.deleteOutstandingForUser(user.id);

    const token = randomBytes(VERIFICATION_TOKEN_BYTES).toString('hex');
    const expiresAt = new Date(
      Date.now() + this.emailVerificationTokenTtlSeconds() * 1000,
    );
    await this.emailVerificationRepository.create({
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt,
    });

    if (this.isProduction()) {
      this.logger.warn(
        `Email verification is required but no mail transport is configured; ` +
          `user ${user.id} cannot receive their verification link.`,
      );
    } else {
      this.logger.log(
        `Email verification token for ${user.email}: ${token} (development only)`,
      );
    }

    return token;
  }

  private buildTokenResponse(user: User): AuthTokenResponse {
    const accessToken = this.jwtService.sign({ sub: user.id, role: user.role });
    return { user: toAuthUser(user), accessToken };
  }

  private bcryptSaltRounds(): number {
    return this.configService.getOrThrow<number>('bcryptSaltRounds');
  }

  private emailVerificationRequired(): boolean {
    return (
      this.configService.get<boolean>('emailVerificationRequired') ?? false
    );
  }

  private emailVerificationTokenTtlSeconds(): number {
    return this.configService.getOrThrow<number>(
      'emailVerificationTokenTtlSeconds',
    );
  }

  private isProduction(): boolean {
    return this.configService.get<string>('nodeEnv') === 'production';
  }
}

/**
 * Verification tokens are stored as SHA-256 hashes. A plain hash (rather
 * than bcrypt) is right here: the token is 32 bytes of CSPRNG output, so
 * there is no dictionary to attack and nothing for a work factor to buy.
 */
function hashToken(token: string): string {
  return createHash('sha256').update(token.trim()).digest('hex');
}
