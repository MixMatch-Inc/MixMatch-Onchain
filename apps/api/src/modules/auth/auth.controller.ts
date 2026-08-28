import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Post,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  loginSchema,
  registerSchema,
  type AuthTokenResponse,
  type LoginInput,
  type MeResponse,
  type RegisterInput,
} from '@mixmatch/shared';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { AuthService } from './auth.service';
import { CurrentUserId } from './current-user.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';

// Stricter throttle on auth endpoints: 10 requests per minute to limit
// credential-stuffing and brute-force attempts (#919).
@Throttle({ default: { ttl: 60_000, limit: 10 } })
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @UsePipes(new ZodValidationPipe(registerSchema))
  register(@Body() body: RegisterInput): Promise<AuthTokenResponse> {
    return this.authService.register(body);
  }

  @Post('login')
  @UsePipes(new ZodValidationPipe(loginSchema))
  login(@Body() body: LoginInput): Promise<AuthTokenResponse> {
    return this.authService.login(body);
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

  @Get('spotify/login')
  spotifyLogin() {
    // TODO: Redirect to Spotify OAuth consent screen
    return { message: 'Spotify OAuth login stub' };
  }

  @Get('spotify/callback')
  spotifyCallback() {
    // TODO: Handle Spotify OAuth callback, exchange code for token
    return { message: 'Spotify OAuth callback stub' };
  }
}
