import test from 'node:test';
import assert from 'node:assert/strict';
import { ErrorCode, ErrorDomain } from '@mixmatch/types';
import { before } from 'node:test';

let errorHandler: typeof import('../src/middleware/error.middleware').errorHandler;
let AuthError: typeof import('../src/utils/errors').AuthError;
let ValidationError: typeof import('../src/utils/errors').ValidationError;

before(async () => {
  process.env.NODE_ENV = 'test';
  process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/mixmatch-test';
  process.env.JWT_SECRET = 'test-secret';

  ({ errorHandler } = await import('../src/middleware/error.middleware'));
  ({ AuthError, ValidationError } = await import('../src/utils/errors'));
});

interface MockRequest {
  headers: Record<string, string>;
  path: string;
  method: string;
  context?: {
    correlationId: string;
    blindMode: boolean;
    clientPlatform: string;
  };
}

interface MockResponse {
  statusCode: number;
  body: any;
  status(code: number): MockResponse;
  json(data: any): MockResponse;
}

const createMockRequest = (): MockRequest => ({
  headers: {},
  path: '/test',
  method: 'GET',
  context: {
    correlationId: 'corr-test',
    blindMode: false,
    clientPlatform: 'test',
  },
});

const createMockResponse = (): MockResponse => ({
  statusCode: 0,
  body: null,
  status(code: number) {
    this.statusCode = code;
    return this;
  },
  json(data: any) {
    this.body = data;
    return this;
  },
});

test('handles AuthError with the mapped HTTP status', () => {
  const mockRequest = createMockRequest();
  const mockResponse = createMockResponse();
  const authError = AuthError.invalidCredentials('test-123');

  errorHandler(authError, mockRequest as any, mockResponse as any, () => {});

  assert.equal(mockResponse.statusCode, 401);
  assert.equal(mockResponse.body.success, false);
  assert.equal(mockResponse.body.error.code, ErrorCode.AUTH_INVALID_CREDENTIALS);
  assert.equal(mockResponse.body.error.domain, ErrorDomain.AUTH);
  assert.equal(mockResponse.body.error.requestId, 'test-123');
});

test('handles ValidationError with a 400 response', () => {
  const mockRequest = createMockRequest();
  const mockResponse = createMockResponse();
  const validationError = ValidationError.requiredFieldMissing(
    'email',
    'test-456',
  );

  errorHandler(validationError, mockRequest as any, mockResponse as any, () => {});

  assert.equal(mockResponse.statusCode, 400);
  assert.equal(mockResponse.body.success, false);
  assert.equal(
    mockResponse.body.error.code,
    ErrorCode.VALIDATION_REQUIRED_FIELD_MISSING,
  );
  assert.equal(mockResponse.body.error.domain, ErrorDomain.VALIDATION);
  assert.equal(mockResponse.body.error.requestId, 'test-456');
});

test('converts unknown errors to infrastructure errors', () => {
  const mockRequest = createMockRequest();
  const mockResponse = createMockResponse();
  const genericError = new Error('Database connection failed');

  errorHandler(genericError, mockRequest as any, mockResponse as any, () => {});

  assert.equal(mockResponse.statusCode, 500);
  assert.equal(mockResponse.body.success, false);
  assert.equal(
    mockResponse.body.error.code,
    ErrorCode.INFRASTRUCTURE_DATABASE_ERROR,
  );
  assert.equal(mockResponse.body.error.domain, ErrorDomain.INFRASTRUCTURE);
});

test('generates a request id if one is not present', () => {
  const mockRequest = createMockRequest();
  const mockResponse = createMockResponse();
  const authError = AuthError.invalidCredentials();

  errorHandler(authError, mockRequest as any, mockResponse as any, () => {});

  assert.match(mockResponse.body.error.requestId, /^req_/);
});

test('uses an existing request id header when present', () => {
  const mockRequest = createMockRequest();
  mockRequest.headers['x-request-id'] = 'existing-id-123';
  const mockResponse = createMockResponse();
  const authError = AuthError.invalidCredentials();

  errorHandler(authError, mockRequest as any, mockResponse as any, () => {});

  assert.equal(mockResponse.body.error.requestId, 'existing-id-123');
});
