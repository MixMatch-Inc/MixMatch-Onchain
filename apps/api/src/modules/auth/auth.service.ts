import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../../shared/config/env.js';
import { ConflictError, UnauthorizedError } from '../../shared/errors/AppError.js';
import type { UserRepository } from '../users/users.repository.js';
import type { User } from '../users/users.types.js';
import type { AuthTokenResponse, AuthUser, LoginDto, RegisterDto } from './auth.types.js';

const PASSWORD_SALT_ROUNDS = 10;
import { ConflictError, NotFoundError, UnauthorizedError } from '../../shared/errors/AppError.js';
import { RateLimitedError } from '../../shared/errors/AuthErrors.js';
import type { UserRepository } from '../users/users.repository.js';
import type { User } from '../users/users.types.js';
import type { AuthTokenResponse, AuthUser, LoginDto, RegisterDto, TokenPair } from './auth.types.js';
import type { SessionService } from './session.service.js';

const PASSWORD_SALT_ROUNDS = 10;
const MAX_FAILED_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

interface FailedAttempt {
  count: number;
  lastAttempt: Date;
}

function toAuthUser(user: User): AuthUser {
  return {
    id: user.id,
    email: user.email,
=======
    role: user.role,
>>>>>>> pr647/feat/phertyameen-issues
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export class AuthService {
<<<<<<< HEAD
  constructor(private readonly userRepository: UserRepository) {}
private readonly failedAttempts = new Map<string, FailedAttempt>();

  constructor(
    private readonly userRepository: UserRepository,
    private readonly sessionService: SessionService,
  ) {}

  async register(input: RegisterDto): Promise<AuthTokenResponse> {
    const existing = await this.userRepository.findByEmail(input.email);
    if (existing) {
      throw new ConflictError('An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(input.password, PASSWORD_SALT_ROUNDS);
    const user = await this.userRepository.create({ email: input.email, passwordHash });

return this.buildTokenResponse(user);
  }

  async login(input: LoginDto): Promise<AuthTokenResponse> {
    const user = await this.userRepository.findByEmail(input.email);
    if (!user) {
return await this.buildTokenResponse(user);
  }

  async login(input: LoginDto): Promise<AuthTokenResponse> {
    const failed = this.failedAttempts.get(input.email);
    if (failed && failed.count >= MAX_FAILED_ATTEMPTS) {
      const elapsed = Date.now() - failed.lastAttempt.getTime();
      if (elapsed < RATE_LIMIT_WINDOW_MS) {
        const retryAfter = Math.ceil((RATE_LIMIT_WINDOW_MS - elapsed) / 1000);
        throw new RateLimitedError('Too many login attempts. Try again later.', retryAfter);
      }
      this.failedAttempts.delete(input.email);
    }

    const user = await this.userRepository.findByEmail(input.email);
    if (!user) {
      this.recordFailedAttempt(input.email);
      throw new UnauthorizedError('Invalid email or password');
    }

    const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);
    if (!passwordMatches) {
throw new UnauthorizedError('Invalid email or password');
    }

    return this.buildTokenResponse(user);
this.recordFailedAttempt(input.email);
      throw new UnauthorizedError('Invalid email or password');
    }

    this.failedAttempts.delete(input.email);
    return await this.buildTokenResponse(user);
  }

  async getCurrentUser(userId: string): Promise<AuthUser | null> {
    const user = await this.userRepository.findById(userId);
    return user ? toAuthUser(user) : null;
  }

private buildTokenResponse(user: User): AuthTokenResponse {
    const accessToken = jwt.sign({ sub: user.id }, env.jwtSecret, {
      expiresIn: env.jwtExpiresIn,
    } as jwt.SignOptions);
async updateProfile(userId: string, data: { email?: string }): Promise<AuthUser> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    const updated = await this.userRepository.update(userId, data);
    return toAuthUser(updated);
  }

  async refreshSession(refreshToken: string): Promise<TokenPair> {
    return this.sessionService.refreshSession(refreshToken);
  }

  async revokeSession(refreshToken: string): Promise<void> {
    await this.sessionService.revokeSession(refreshToken);
  }

  async revokeAllUserSessions(userId: string): Promise<void> {
    await this.sessionService.revokeAllUserSessions(userId);
  }

  resetFailedAttempts(email: string): void {
    this.failedAttempts.delete(email);
  }

  private recordFailedAttempt(email: string): void {
    const existing = this.failedAttempts.get(email);
    if (existing) {
      existing.count++;
      existing.lastAttempt = new Date();
    } else {
      this.failedAttempts.set(email, { count: 1, lastAttempt: new Date() });
    }
  }

  private async buildTokenResponse(user: User): Promise<AuthTokenResponse> {
    const { accessToken } = await this.sessionService.createSession(user.id);
    return { user: toAuthUser(user), accessToken };
  }
}
