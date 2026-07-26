import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthExceptionFilter } from './auth-exception.filter';

describe('AuthExceptionFilter — Regression & Edge Case Coverage', () => {
  let filter: AuthExceptionFilter;

  const mockResponse = () => {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  const mockArgumentsHost = (request: any, response: any): ArgumentsHost =>
    ({
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as unknown as ArgumentsHost);

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthExceptionFilter],
    }).compile();

    filter = module.get<AuthExceptionFilter>(AuthExceptionFilter);
  });

  // ─── 1. Error Code Mapping Regression Tests ─────────────────────────────

  describe('HTTP Status to Error Code Mapping', () => {
    it('maps 401 UNAUTHORIZED to UNAUTHORIZED_ACCESS', () => {
      const res = mockResponse();
      const host = mockArgumentsHost({ url: '/api/v1/auth/me', method: 'GET' }, res);
      const exception = new HttpException('Token missing', HttpStatus.UNAUTHORIZED);

      filter.catch(exception, host);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          errorCode: 'UNAUTHORIZED_ACCESS',
          message: 'Token missing',
        }),
      );
    });

    it('maps 403 FORBIDDEN to INSUFFICIENT_PERMISSIONS', () => {
      const res = mockResponse();
      const host = mockArgumentsHost({ url: '/api/v1/admin/settings', method: 'POST' }, res);
      const exception = new HttpException('Admin role required', HttpStatus.FORBIDDEN);

      filter.catch(exception, host);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
          errorCode: 'INSUFFICIENT_PERMISSIONS',
          message: 'Admin role required',
        }),
      );
    });

    it('maps 503 SERVICE_UNAVAILABLE to AUTH_SERVICE_UNAVAILABLE', () => {
      const res = mockResponse();
      const host = mockArgumentsHost({ url: '/api/v1/auth/verify', method: 'POST' }, res);
      const exception = new HttpException(
        'Auth RPC node unreachable',
        HttpStatus.SERVICE_UNAVAILABLE,
      );

      filter.catch(exception, host);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 503,
          errorCode: 'AUTH_SERVICE_UNAVAILABLE',
          message: 'Auth RPC node unreachable',
        }),
      );
    });

    it('defaults unmapped statuses to generic AUTH_ERROR code', () => {
      const res = mockResponse();
      const host = mockArgumentsHost({ url: '/api/v1/auth/login', method: 'POST' }, res);
      const exception = new HttpException('Bad Request Payload', HttpStatus.BAD_REQUEST);

      filter.catch(exception, host);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          errorCode: 'AUTH_ERROR',
          message: 'Bad Request Payload',
        }),
      );
    });
  });

  // ─── 2. Payload Structure Edge Cases ─────────────────────────────────────

  describe('Exception Response Payload Formats', () => {
    it('extracts first error message when exception response is an array (e.g. ValidationPipe)', () => {
      const res = mockResponse();
      const host = mockArgumentsHost({ url: '/api/v1/auth/challenge', method: 'POST' }, res);
      const exception = new HttpException(
        { message: ['Stellar address is required', 'Address must be string'] },
        HttpStatus.BAD_REQUEST,
      );

      filter.catch(exception, host);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Stellar address is required',
        }),
      );
    });

    it('includes request path and ISO timestamp in response payload', () => {
      const res = mockResponse();
      const path = '/api/v1/auth/verify?nonce=123';
      const host = mockArgumentsHost({ url: path, method: 'GET' }, res);
      const exception = new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);

      filter.catch(exception, host);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          path,
          timestamp: expect.stringMatching(
            /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
          ),
        }),
      );
    });
  });
});