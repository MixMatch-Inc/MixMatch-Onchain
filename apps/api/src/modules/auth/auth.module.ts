import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { RateLimitGuard } from '../../common/rate-limit.guard';
import { UsersRepository } from '../users/users.repository';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { EmailVerificationRepository } from './email-verification.repository';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { SseTokenService } from './sse-token.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('jwtSecret'),
        signOptions: {
          expiresIn: config.getOrThrow<number>('jwtExpiresInSeconds'),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    UsersRepository,
    EmailVerificationRepository,
    JwtAuthGuard,
    RolesGuard,
    RateLimitGuard,
    SseTokenService,
  ],
  // SseTokenService is exported because JwtAuthGuard depends on it, and
  // other modules (PaymentsModule) resolve the guard from here.
  exports: [JwtAuthGuard, RolesGuard, SseTokenService, JwtModule],
})
export class AuthModule {}
