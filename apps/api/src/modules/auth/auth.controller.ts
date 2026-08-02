import { Controller, Get, Post } from '@nestjs/common';

@Controller('auth')
export class AuthController {
  @Post('login')
  login() {
    // TODO: Implement JWT login
    return { message: 'Login endpoint stub' };
  }

  @Post('signup')
  signup() {
    // TODO: Implement user registration
    return { message: 'Signup endpoint stub' };
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
