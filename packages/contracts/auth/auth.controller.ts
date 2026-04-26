import { Body, Controller, Post } from '@nestjs/common';
import { LegacyAuthAdapter } from './legacy-auth.adapter';

@Controller('auth')
export class AuthController {
  @Post('signup')
  signup(@Body() body: any) {
    const payload = LegacyAuthAdapter.signup(body);

    return {
      message: 'Signup payload accepted',
      payload,
    };
  }

  @Post('login')
  login(@Body() body: any) {
    const payload = LegacyAuthAdapter.login(body);

    return {
      message: 'Login payload accepted',
      payload,
    };
  }
}
