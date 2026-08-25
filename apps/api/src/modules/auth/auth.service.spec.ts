import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import type { User } from '../users/users.repository';
import { UsersRepository } from '../users/users.repository';
import { AuthService } from './auth.service';

function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'user@example.com',
    passwordHash: null,
    role: 'USER',
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    updatedAt: new Date('2025-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

describe('AuthService', () => {
  let service: AuthService;
  let usersRepository: {
    findByEmail: jest.Mock;
    findById: jest.Mock;
    create: jest.Mock<Promise<User>, [{ email: string; passwordHash: string }]>;
  };

  beforeEach(async () => {
    usersRepository = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      create: jest.fn<
        Promise<User>,
        [{ email: string; passwordHash: string }]
      >(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersRepository, useValue: usersRepository },
        {
          provide: JwtService,
          useValue: { sign: jest.fn().mockReturnValue('signed-token') },
        },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  describe('register', () => {
    it('creates a user with a hashed password and returns a token', async () => {
      usersRepository.findByEmail.mockResolvedValue(null);
      usersRepository.create.mockImplementation(
        ({ email, passwordHash }: { email: string; passwordHash: string }) =>
          Promise.resolve(buildUser({ email, passwordHash })),
      );

      const result = await service.register({
        email: 'new@example.com',
        password: 'password123',
      });

      expect(result.accessToken).toBe('signed-token');
      expect(result.user.email).toBe('new@example.com');
      const createCall = usersRepository.create.mock.calls[0][0];
      expect(createCall.passwordHash).not.toBe('password123');
      expect(await bcrypt.compare('password123', createCall.passwordHash)).toBe(
        true,
      );
    });

    it('rejects registration when the email is already in use', async () => {
      usersRepository.findByEmail.mockResolvedValue(buildUser());

      await expect(
        service.register({
          email: 'user@example.com',
          password: 'password123',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('never exposes the password hash in the returned user', async () => {
      usersRepository.findByEmail.mockResolvedValue(null);
      usersRepository.create.mockResolvedValue(
        buildUser({ passwordHash: 'super-secret-hash' }),
      );

      const result = await service.register({
        email: 'user@example.com',
        password: 'password123',
      });

      expect(result.user).not.toHaveProperty('passwordHash');
    });
  });

  describe('login', () => {
    it('logs in with valid credentials', async () => {
      const passwordHash = await bcrypt.hash('password123', 10);
      usersRepository.findByEmail.mockResolvedValue(
        buildUser({ passwordHash }),
      );

      const result = await service.login({
        email: 'user@example.com',
        password: 'password123',
      });

      expect(result.accessToken).toBe('signed-token');
    });

    it('rejects a nonexistent email', async () => {
      usersRepository.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'ghost@example.com', password: 'password123' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects an incorrect password', async () => {
      const passwordHash = await bcrypt.hash('correct-password', 10);
      usersRepository.findByEmail.mockResolvedValue(
        buildUser({ passwordHash }),
      );

      await expect(
        service.login({
          email: 'user@example.com',
          password: 'wrong-password',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects a user with no password set (e.g. OAuth-only account)', async () => {
      usersRepository.findByEmail.mockResolvedValue(
        buildUser({ passwordHash: null }),
      );

      await expect(
        service.login({ email: 'user@example.com', password: 'anything' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('getCurrentUser', () => {
    it('returns the user when found', async () => {
      usersRepository.findById.mockResolvedValue(buildUser({ id: 'user-42' }));

      const result = await service.getCurrentUser('user-42');

      expect(result?.id).toBe('user-42');
    });

    it('returns null when not found', async () => {
      usersRepository.findById.mockResolvedValue(null);

      expect(await service.getCurrentUser('missing')).toBeNull();
    });
  });
});
