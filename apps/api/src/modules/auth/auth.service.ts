import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type {
  AuthTokenResponse,
  AuthUser,
  LoginInput,
  RegisterInput,
} from '@mixmatch/shared';
import * as bcrypt from 'bcryptjs';
import { UsersRepository, type User } from '../users/users.repository';

const PASSWORD_SALT_ROUNDS = 10;

/**
 * #918: Server-side password strength rules applied as defense in depth
 * even if the Zod schema at the shared layer is bypassed (e.g. direct API
 * calls or future schema relaxation).
 *
 * Rules:
 * - At least 8 characters (mirrors shared schema)
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one digit
 */
function assertPasswordStrength(password: string): void {
  if (password.length < 8) {
    throw new BadRequestException('Password must be at least 8 characters long');
  }
  if (!/[A-Z]/.test(password)) {
    throw new BadRequestException('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    throw new BadRequestException('Password must contain at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    throw new BadRequestException('Password must contain at least one digit');
  }
}

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
  ) {}

  async register(input: RegisterInput): Promise<AuthTokenResponse> {
    // #918: enforce password strength server-side as defense in depth
    assertPasswordStrength(input.password);

    const existing = await this.usersRepository.findByEmail(input.email);
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(
      input.password,
      PASSWORD_SALT_ROUNDS,
    );
    const user = await this.usersRepository.create({
      email: input.email,
      passwordHash,
    });

    return this.buildTokenResponse(user);
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
