import {
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

function toAuthUser(user: User): AuthUser {
  return {
    id: user.id,
    email: user.email,
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
    const accessToken = this.jwtService.sign({ sub: user.id });
    return { user: toAuthUser(user), accessToken };
  }
}
