import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Post,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  loginSchema,
  registerSchema,
  resendVerificationSchema,
  verifyEmailSchema,
  type AuthTokenResponse,
  type LoginInput,
  type MeResponse,
  type RegisterInput,
  type RegisterResponse,
  type ResendVerificationInput,
  type SseTokenResponse,
  type UserRole,
  type VerifyEmailInput,
  type VerifyEmailResponse,
} from '@mixmatch/shared';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { RateLimit } from '../../common/rate-limit.decorator';
import { RateLimitGuard } from '../../common/rate-limit.guard';
import { AuthService } from './auth.service';
import { CurrentUserId, CurrentUserRole } from './current-user.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';
import { SseTokenService } from './sse-token.service';

const HOUR_MS = 60 * 60 * 1000;

@Controller('auth')
@UseGuards(RateLimitGuard)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly sseTokenService: SseTokenService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Throttled per IP: this route is unauthenticated by definition, so
   * without a limit anyone can script unlimited account creation. The cap is
   * generous enough that a shared NAT or office egress IP won't trip it in
   * normal use, but low enough to make bulk signup impractical.
   */
  @Post('register')
  @RateLimit({
    max: 5,
    windowMs: HOUR_MS,
    message:
      'Too many accounts created from this address — please try again later',
  })
  @UsePipes(new ZodValidationPipe(registerSchema))
  register(@Body() body: RegisterInput): Promise<RegisterResponse> {
    return this.authService.register(body);
  }

  /** Throttled to blunt credential stuffing against known addresses. */
  @Post('login')
  @RateLimit({
    max: 10,
    windowMs: 15 * 60 * 1000,
    message: 'Too many sign-in attempts — please try again later',
  })
  @UsePipes(new ZodValidationPipe(loginSchema))
  login(@Body() body: LoginInput): Promise<AuthTokenResponse> {
    return this.authService.login(body);
  }

  /** Redeems the token emailed on registration. Single-use. */
  @Post('verify-email')
  @RateLimit({
    max: 10,
    windowMs: HOUR_MS,
    message: 'Too many verification attempts — please try again later',
  })
  @UsePipes(new ZodValidationPipe(verifyEmailSchema))
  verifyEmail(@Body() body: VerifyEmailInput): Promise<VerifyEmailResponse> {
    return this.authService.verifyEmail(body.token);
  }

  /**
   * Issues a fresh verification link. Always returns 202 regardless of
   * whether the address has an account, so it can't be used to enumerate
   * registered users.
   */
  @Post('resend-verification')
  @HttpCode(HttpStatus.ACCEPTED)
  @RateLimit({
    max: 3,
    windowMs: HOUR_MS,
    message: 'Too many verification emails requested — please try again later',
  })
  @UsePipes(new ZodValidationPipe(resendVerificationSchema))
  async resendVerification(
    @Body() body: ResendVerificationInput,
  ): Promise<{ status: string }> {
    await this.authService.resendVerification(body.email);
    return { status: 'accepted' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUserId() userId: string): Promise<MeResponse> {
    const user = await this.authService.getCurrentUser(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return { user };
  }

  /**
   * Mints a short-lived, single-use token for the `GET /payments/stream`
   * SSE endpoint, which can only authenticate through the URL because
   * `EventSource` cannot set an `Authorization` header.
   *
   * Callers authenticate here with their normal bearer token — over a
   * header, where it isn't logged — and put only the returned throwaway
   * token in the stream URL. Mint a fresh one per connection.
   */
  @Post('sse-token')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @RateLimit({
    max: 60,
    windowMs: 60 * 1000,
    message: 'Too many stream tokens requested — please slow down',
  })
  sseToken(
    @CurrentUserId() userId: string,
    @CurrentUserRole() role: UserRole | undefined,
  ): SseTokenResponse {
    return this.sseTokenService.mint(userId, role);
  }

  /**
   * Unimplemented. Gated behind SPOTIFY_OAUTH_ENABLED so the stubs 404
   * everywhere the flag isn't explicitly set — an unauthenticated route
   * returning a placeholder has no business being reachable in production.
   * Remove the flag once the real OAuth exchange lands.
   */
  @Get('spotify/login')
  spotifyLogin() {
    this.assertSpotifyOauthEnabled();
    // TODO: Redirect to Spotify OAuth consent screen
    return { message: 'Spotify OAuth login stub' };
  }

  @Get('spotify/callback')
  spotifyCallback() {
    this.assertSpotifyOauthEnabled();
    // TODO: Handle Spotify OAuth callback, exchange code for token
    return { message: 'Spotify OAuth callback stub' };
  }

  private assertSpotifyOauthEnabled(): void {
    if (!this.configService.get<boolean>('spotifyOauthEnabled')) {
      throw new NotFoundException('Cannot GET this route');
    }
  }
}
