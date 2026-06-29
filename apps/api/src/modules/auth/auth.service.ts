import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../../shared/config/env.js';
import { ConflictError, UnauthorizedError } from '../../shared/errors/AppError.js';
import type { UserRepository } from '../users/users.repository.js';
import type { User } from '../users/users.types.js';
import type { AuthTokenResponse, AuthUser, LoginDto, RegisterDto } from './auth.types.js';

const PASSWORD_SALT_ROUNDS = 10;

function toAuthUser(user: User): AuthUser {
  return {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export class AuthService {
  constructor(private readonly userRepository: UserRepository) {}

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
      throw new UnauthorizedError('Invalid email or password');
    }

    const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedError('Invalid email or password');
    }

    return this.buildTokenResponse(user);
  }

  async getCurrentUser(userId: string): Promise<AuthUser | null> {
    const user = await this.userRepository.findById(userId);
    return user ? toAuthUser(user) : null;
  }

  private buildTokenResponse(user: User): AuthTokenResponse {
    const accessToken = jwt.sign({ sub: user.id }, env.jwtSecret, {
      expiresIn: env.jwtExpiresIn,
    } as jwt.SignOptions);

    return { user: toAuthUser(user), accessToken };
  }
}
