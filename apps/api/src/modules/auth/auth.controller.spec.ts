import {
    INestApplication,
    NotFoundException,
    RequestMethod,
  } from '@nestjs/common';
  import {
    GUARDS_METADATA,
    METHOD_METADATA,
    PATH_METADATA,
    PIPES_METADATA,
  } from '@nestjs/common/constants';
  import { ConfigService } from '@nestjs/config';
  import { Test } from '@nestjs/testing';
  import request from 'supertest';
  import { RateLimitGuard } from '../../common/rate-limit.guard';
  import { ZodValidationPipe } from '../../common/zod-validation.pipe';
  import { AuthController } from './auth.controller';
  import { AuthService } from './auth.service';
  import { JwtAuthGuard } from './jwt-auth.guard';
  import { SseTokenService } from './sse-token.service';
  
  describe('AuthController', () => {
    let app: INestApplication;
    let authService: {
      register: jest.Mock;
      login: jest.Mock;
      verifyEmail: jest.Mock;
      resendVerification: jest.Mock;
      getCurrentUser: jest.Mock;
    };
    let sseTokenService: { mint: jest.Mock };
    let configService: { get: jest.Mock };
  
    beforeAll(async () => {
      authService = {
        register: jest.fn(),
        login: jest.fn(),
        verifyEmail: jest.fn(),
        resendVerification: jest.fn(),
        getCurrentUser: jest.fn(),
      };
      sseTokenService = { mint: jest.fn() };
      configService = { get: jest.fn() };
  
      const moduleRef = await Test.createTestingModule({
        controllers: [AuthController],
        providers: [
          { provide: AuthService, useValue: authService },
          { provide: SseTokenService, useValue: sseTokenService },
          { provide: ConfigService, useValue: configService },
          RateLimitGuard,
          {
            provide: JwtAuthGuard,
            useValue: {
              canActivate: (context: {
                switchToHttp: () => { getRequest: () => Record<string, unknown> };
              }) => {
                const request = context.switchToHttp().getRequest();
                request.userId = 'user-1';
                request.userRole = 'USER';
                return true;
              },
            },
          },
        ],
      }).compile();
  
      app = moduleRef.createNestApplication();
      await app.init();
    });
  
    beforeEach(() => {
      jest.clearAllMocks();
      configService.get.mockReturnValue(false);
    });
  
    afterAll(async () => {
      await app.close();
    });
  
    it('wires its auth routes, guards, and validation pipes through Nest metadata', () => {
      expect(Reflect.getMetadata(PATH_METADATA, AuthController)).toBe('auth');
      expect(Reflect.getMetadata(GUARDS_METADATA, AuthController)).toContain(
        RateLimitGuard,
      );
  
      const routes: Array<[keyof AuthController, string, RequestMethod]> = [
        ['register', 'register', RequestMethod.POST],
        ['login', 'login', RequestMethod.POST],
        ['verifyEmail', 'verify-email', RequestMethod.POST],
        ['resendVerification', 'resend-verification', RequestMethod.POST],
        ['me', 'me', RequestMethod.GET],
        ['sseToken', 'sse-token', RequestMethod.POST],
        ['spotifyLogin', 'spotify/login', RequestMethod.GET],
        ['spotifyCallback', 'spotify/callback', RequestMethod.GET],
      ];
  
      for (const [handler, path, method] of routes) {
        expect(
          Reflect.getMetadata(PATH_METADATA, AuthController.prototype[handler]),
        ).toBe(path);
        expect(
          Reflect.getMetadata(METHOD_METADATA, AuthController.prototype[handler]),
        ).toBe(method);
      }
  
      for (const handler of [
        'register',
        'login',
        'verifyEmail',
        'resendVerification',
      ] as const) {
        expect(
          Reflect.getMetadata(PIPES_METADATA, AuthController.prototype[handler]),
        ).toEqual(expect.arrayContaining([expect.any(ZodValidationPipe)]));
      }
  
      for (const handler of ['me', 'sseToken'] as const) {
        expect(
          Reflect.getMetadata(GUARDS_METADATA, AuthController.prototype[handler]),
        ).toContain(JwtAuthGuard);
      }
    });
  
    it('routes public auth requests through their validation pipes and services', async () => {
      authService.register.mockResolvedValue({ accessToken: 'register-token' });
      authService.login.mockResolvedValue({ accessToken: 'login-token' });
      authService.verifyEmail.mockResolvedValue({ verified: true });
      authService.resendVerification.mockResolvedValue(undefined);
  
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: ' NEW@EXAMPLE.COM ', password: 'password123' })
        .expect(201, { accessToken: 'register-token' });
      expect(authService.register).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'password123',
      });
  
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'user@example.com', password: 'password123' })
        .expect(201, { accessToken: 'login-token' });
  
      const token = 'a'.repeat(64);
      await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({ token })
        .expect(201, { verified: true });
      expect(authService.verifyEmail).toHaveBeenCalledWith(token);
  
      await request(app.getHttpServer())
        .post('/auth/resend-verification')
        .send({ email: 'user@example.com' })
        .expect(202, { status: 'accepted' });
      expect(authService.resendVerification).toHaveBeenCalledWith('user@example.com');
    });
  
    it('rejects invalid public auth bodies before they reach the service', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'not-an-email', password: 'short' })
        .expect(400);
  
      expect(authService.register).not.toHaveBeenCalled();
    });
  
    it('uses the JWT-protected current-user route and returns 404 for a missing user', async () => {
      authService.getCurrentUser.mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
      });
  
      await request(app.getHttpServer())
        .get('/auth/me')
        .expect(200, { user: { id: 'user-1', email: 'user@example.com' } });
      expect(authService.getCurrentUser).toHaveBeenCalledWith('user-1');
  
      authService.getCurrentUser.mockResolvedValue(null);
      const response = await request(app.getHttpServer())
        .get('/auth/me')
        .expect(404);
      expect(response.body.message).toBe(
        new NotFoundException('User not found').message,
      );
    });
  
    it('mints an SSE token using identity injected by the JWT guard', async () => {
      sseTokenService.mint.mockReturnValue({
        token: 'sse-token',
        expiresInSeconds: 60,
      });
  
      await request(app.getHttpServer())
        .post('/auth/sse-token')
        .expect(200, { token: 'sse-token', expiresInSeconds: 60 });
  
      expect(sseTokenService.mint).toHaveBeenCalledWith('user-1', 'USER');
    });
  
    it('keeps Spotify stub routes hidden unless Spotify OAuth is explicitly enabled', async () => {
      await request(app.getHttpServer()).get('/auth/spotify/login').expect(404);
      await request(app.getHttpServer()).get('/auth/spotify/callback').expect(404);
  
      configService.get.mockReturnValue(true);
      await request(app.getHttpServer())
        .get('/auth/spotify/login')
        .expect(200, { message: 'Spotify OAuth login stub' });
      await request(app.getHttpServer())
        .get('/auth/spotify/callback')
        .expect(200, { message: 'Spotify OAuth callback stub' });
    });
  });