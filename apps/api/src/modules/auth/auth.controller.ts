import { Controller, Get, Post, Body, Req, UseGuards } from '@nestjs/common';

@Controller('auth')
export class AuthController {
  
  @Post('login')
  async login(@Body() body: any) {
    // TODO: Implement JWT login
    return { message: 'Login endpoint stub' };
  }

  @Post('signup')
  async signup(@Body() body: any) {
    // TODO: Implement user registration
    return { message: 'Signup endpoint stub' };
  }

  @Get('spotify/login')
  async spotifyLogin() {
    // TODO: Redirect to Spotify OAuth consent screen
    return { message: 'Spotify OAuth login stub' };
  }

  @Get('spotify/callback')
  async spotifyCallback(@Req() req: any) {
    // TODO: Handle Spotify OAuth callback, exchange code for token
    return { message: 'Spotify OAuth callback stub' };
  }
}
