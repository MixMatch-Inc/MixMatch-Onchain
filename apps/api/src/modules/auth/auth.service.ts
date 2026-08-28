import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type {
  AuthTokenResponse,
  AuthUser,
  LoginInput,
  RegisterInput,
} from '@mixmatch/shared';
import * as bcrypt from 'bcryptjs';
import { UsersRepository, type User } from '../users/users.repository';

const DEFAULT_PASSWORD_SALT_ROUNDS = 10;

function toAuthUser(user: User): AuthUser {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private get passwordSaltRounds(): number {
    return (
      this.configService.get<number>('BCRYPT_SALT_ROUNDS') ??
      DEFAULT_PASSWORD_SALT_ROUNDS
    );
  }

  async register(input: RegisterInput): Promise<AuthTokenResponse> {
    const existing = await this.usersRepository.findByEmail(input.email);
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    // Defense-in-depth: enforce password strength at the service layer
    // independently of the DTO/Zod schema so the rule is upheld even if the
    // schema is loosened or the endpoint is called without the pipe (#918).
    this.assertPasswordStrength(input.password);

    const passwordHash = await bcrypt.hash(
      input.password,
      this.passwordSaltRounds,
    );
    const user = await this.usersRepository.create({
      email: input.email,
      passwordHash,
    });

    return this.buildTokenResponse(user);
  }

  /**
   * Enforces a minimum password complexity rule at the service layer.
   * Requirements: at least 8 characters, one uppercase letter, one
   * lowercase letter, and one digit.
   */
  private assertPasswordStrength(password: string): void {
    if (password.length < 8) {
      throw new ConflictException('Password must be at least 8 characters long');
    }
    if (!/[A-Z]/.test(password)) {
      throw new ConflictException('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      throw new ConflictException('Password must contain at least one lowercase letter');
    }
    if (!/\d/.test(password)) {
      throw new ConflictException('Password must contain at least one digit');
    }
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

    return this.buildTokenResponse(user);
  }

  async getCurrentUser(userId: string): Promise<AuthUser | null> {
    const user = await this.usersRepository.findById(userId);
    return user ? toAuthUser(user) : null;
  }

  private buildTokenResponse(user: User): AuthTokenResponse {
    const accessToken = this.jwtService.sign({ sub: user.id, role: user.role });
    return { user: toAuthUser(user), accessToken };
  }
}
