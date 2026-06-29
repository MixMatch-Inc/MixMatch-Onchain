import test from 'node:test';
import assert from 'node:assert/strict';
import { before } from 'node:test';

let requireAuth: typeof import('../src/middleware/auth.middleware').requireAuth;
let requireRole: typeof import('../src/middleware/auth.middleware').requireRole;
let generateToken: typeof import('../src/services/jwt.service').generateToken;

before(async () => {
  process.env.NODE_ENV = 'test';
  process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/mixmatch-test';
  process.env.JWT_SECRET = 'test-secret';

  ({ requireAuth, requireRole } = await import('../src/middleware/auth.middleware'));
  ({ generateToken } = await import('../src/services/jwt.service'));
});

interface MockRequest {
  headers: Record<string, string>;
  user?: { userId: string; role: string };
  context?: { actor?: { userId: string; role: string } };
  header(name: string): string | undefined;
}

interface MockResponse {
  statusCode: number;
  body: any;
  status(code: number): MockResponse;
  json(data: any): MockResponse;
}

const createMockRequest = (authorizationHeader?: string): MockRequest => {
  const headers: Record<string, string> = {};
  if (authorizationHeader) {
    headers.authorization = authorizationHeader;
  }

  return {
    headers,
    context: { actor: undefined },
    header(name: string) {
      return headers[name.toLowerCase()];
    },
  };
};

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

const createNextSpy = () => {
  let calls = 0;
  const next = () => {
    calls += 1;
  };
  return { next, callCount: () => calls };
};

// ---- requireAuth ----

test('requireAuth calls next() and attaches req.user for a valid token', () => {
  const token = generateToken('user-1', 'DJ' as never);
  const mockRequest = createMockRequest(`Bearer ${token}`);
  const mockResponse = createMockResponse();
  const { next, callCount } = createNextSpy();

  requireAuth(mockRequest as any, mockResponse as any, next);

  assert.equal(callCount(), 1);
  assert.equal(mockResponse.statusCode, 0);
  assert.equal(mockRequest.user?.userId, 'user-1');
  assert.equal(mockRequest.user?.role, 'DJ');
});

test('requireAuth attaches the actor to req.context when context exists', () => {
  const token = generateToken('user-2', 'PLANNER' as never);
  const mockRequest = createMockRequest(`Bearer ${token}`);
  const mockResponse = createMockResponse();
  const { next } = createNextSpy();

  requireAuth(mockRequest as any, mockResponse as any, next);

  assert.equal(mockRequest.context?.actor?.userId, 'user-2');
  assert.equal(mockRequest.context?.actor?.role, 'PLANNER');
});

test('requireAuth returns 401 when the authorization header is missing', () => {
  const mockRequest = createMockRequest();
  const mockResponse = createMockResponse();
  const { next, callCount } = createNextSpy();

  requireAuth(mockRequest as any, mockResponse as any, next);

  assert.equal(callCount(), 0);
  assert.equal(mockResponse.statusCode, 401);
  assert.equal(mockResponse.body.message, 'Unauthorized: missing or invalid token');
});

test('requireAuth returns 401 when the header has no Bearer prefix', () => {
  const token = generateToken('user-3', 'DJ' as never);
  const mockRequest = createMockRequest(token); // no "Bearer " prefix
  const mockResponse = createMockResponse();
  const { next, callCount } = createNextSpy();

  requireAuth(mockRequest as any, mockResponse as any, next);

  assert.equal(callCount(), 0);
  assert.equal(mockResponse.statusCode, 401);
});

test('requireAuth returns 401 when the header is just "Bearer" with no token', () => {
  const mockRequest = createMockRequest('Bearer');
  const mockResponse = createMockResponse();
  const { next, callCount } = createNextSpy();

  requireAuth(mockRequest as any, mockResponse as any, next);

  assert.equal(callCount(), 0);
  assert.equal(mockResponse.statusCode, 401);
});

test('requireAuth returns 401 for a malformed/garbage token', () => {
  const mockRequest = createMockRequest('Bearer not-a-real-token');
  const mockResponse = createMockResponse();
  const { next, callCount } = createNextSpy();

  requireAuth(mockRequest as any, mockResponse as any, next);

  assert.equal(callCount(), 0);
  assert.equal(mockResponse.statusCode, 401);
  assert.equal(mockResponse.body.message, 'Unauthorized: missing or invalid token');
});

test('requireAuth returns 401 for an expired token', async () => {
  const jwt = await import('jsonwebtoken');
  const expiredToken = jwt.sign(
    { userId: 'user-4', role: 'DJ' },
    process.env.JWT_SECRET as string,
    { expiresIn: -10 }, // already expired
  );

  const mockRequest = createMockRequest(`Bearer ${expiredToken}`);
  const mockResponse = createMockResponse();
  const { next, callCount } = createNextSpy();

  requireAuth(mockRequest as any, mockResponse as any, next);

  assert.equal(callCount(), 0);
  assert.equal(mockResponse.statusCode, 401);
});

test('requireAuth returns 401 for a token signed with the wrong secret', async () => {
  const jwt = await import('jsonwebtoken');
  const wrongSecretToken = jwt.sign(
    { userId: 'user-5', role: 'DJ' },
    'a-different-secret',
    { expiresIn: '1h' },
  );

  const mockRequest = createMockRequest(`Bearer ${wrongSecretToken}`);
  const mockResponse = createMockResponse();
  const { next, callCount } = createNextSpy();

  requireAuth(mockRequest as any, mockResponse as any, next);

  assert.equal(callCount(), 0);
  assert.equal(mockResponse.statusCode, 401);
});

// ---- requireRole ----

test('requireRole calls next() when the user has an allowed role', () => {
  const mockRequest = createMockRequest();
  mockRequest.user = { userId: 'user-6', role: 'DJ' };
  const mockResponse = createMockResponse();
  const { next, callCount } = createNextSpy();

  const guard = requireRole(['DJ', 'PLANNER'] as never);
  guard(mockRequest as any, mockResponse as any, next);

  assert.equal(callCount(), 1);
  assert.equal(mockResponse.statusCode, 0);
});

test('requireRole returns 403 when the user role is not allowed', () => {
  const mockRequest = createMockRequest();
  mockRequest.user = { userId: 'user-7', role: 'MUSIC_LOVER' };
  const mockResponse = createMockResponse();
  const { next, callCount } = createNextSpy();

  const guard = requireRole(['DJ', 'PLANNER'] as never);
  guard(mockRequest as any, mockResponse as any, next);

  assert.equal(callCount(), 0);
  assert.equal(mockResponse.statusCode, 403);
  assert.equal(mockResponse.body.message, 'Forbidden: insufficient role permissions');
});

test('requireRole returns 401 when req.user is missing (requireAuth not run)', () => {
  const mockRequest = createMockRequest();
  const mockResponse = createMockResponse();
  const { next, callCount } = createNextSpy();

  const guard = requireRole(['DJ'] as never);
  guard(mockRequest as any, mockResponse as any, next);

  assert.equal(callCount(), 0);
  assert.equal(mockResponse.statusCode, 401);
});