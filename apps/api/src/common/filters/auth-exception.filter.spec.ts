import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthExceptionFilter } from './auth-exception.filter';

describe('AuthExceptionFilter — Core Flow', () => {
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

  it('formats unauthorized exceptions into standard auth error responses', () => {
    const res = mockResponse();
    const req = { url: '/api/v1/profile', method: 'GET' };
    const host = mockArgumentsHost(req, res);
    const exception = new HttpException('Invalid token', HttpStatus.UNAUTHORIZED);

    filter.catch(exception, host);

    expect(res.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 401,
        errorCode: 'UNAUTHORIZED_ACCESS',
        message: 'Invalid token',
        path: '/api/v1/profile',
      }),
    );
  });
});