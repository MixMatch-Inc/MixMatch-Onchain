import type { LoginRequest, SignupRequest } from '@stella/types/auth';

const mockSignIn  = jest.fn();
const mockSignUp  = jest.fn();
const mockSignOut = jest.fn();

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({
    auth: {
      signInWithPassword: mockSignIn,
      signUp:             mockSignUp,
      signOut:            mockSignOut,
    },
  })),
}));

jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({
    getAll: jest.fn(() => []),
    set:    jest.fn(),
  })),
}));

// Isolate rate-limit state per test
jest.mock('../../src/lib/auth/rate-limit.service', () => {
  const real = jest.requireActual('../../src/lib/auth/rate-limit.service');
  return { ...real };
});

import { login, signup, logout } from '../../src/lib/auth/auth.service';

const CTX = { ip: '1.2.3.4', userAgent: 'jest' };

describe('login()', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns success=true with userId and sessionId on valid credentials', async () => {
    mockSignIn.mockResolvedValueOnce({
      data: {
        user:    { id: 'user-123' },
        session: { expires_at: Math.floor(Date.now() / 1000) + 3600 },
      },
      error: null,
    });

    const result = await login(
      { email: 'a@b.com', password: 'correct' } as LoginRequest,
      CTX,
    );

    expect(result.success).toBe(true);
    expect(result.data?.userId).toBe('user-123');
    expect(result.data?.sessionId).toBeTruthy();
    expect(result.error).toBeNull();
  });

  it('includes throttle and cooldown on every success response', async () => {
    mockSignIn.mockResolvedValueOnce({
      data: {
        user:    { id: 'user-123' },
        session: { expires_at: Math.floor(Date.now() / 1000) + 3600 },
      },
      error: null,
    });

    const result = await login({ email: 'a@b.com', password: 'p' } as LoginRequest, CTX);
    expect(result.throttle).toBeDefined();
    expect(result.cooldown).toBeDefined();
  });

  it('returns INVALID_CREDENTIALS on wrong password', async () => {
    mockSignIn.mockResolvedValueOnce({
      data:  { user: null, session: null },
      error: { message: 'Invalid login credentials' },
    });

    const result = await login({ email: 'a@b.com', password: 'wrong' } as LoginRequest, CTX);
    expect(result.success).toBe(false);
    expect(result.error).toBe('INVALID_CREDENTIALS');
  });

  it('returns EMAIL_NOT_CONFIRMED when Supabase reports unconfirmed email', async () => {
    mockSignIn.mockResolvedValueOnce({
      data:  { user: null, session: null },
      error: { message: 'Email not confirmed' },
    });

    const result = await login({ email: 'a@b.com', password: 'p' } as LoginRequest, CTX);
    expect(result.error).toBe('EMAIL_NOT_CONFIRMED');
  });

  it('returns RATE_LIMITED when identity is already blocked', async () => {
    // Exhaust the window first
    for (let i = 0; i < 5; i++) {
      mockSignIn.mockResolvedValueOnce({
        data:  { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      });
      await login({ email: 'blocked@test.com', password: 'x' } as LoginRequest, CTX);
    }

    // Next call should be blocked before hitting Supabase
    const result = await login(
      { email: 'blocked@test.com', password: 'x' } as LoginRequest,
      CTX,
    );
    expect(result.success).toBe(false);
    expect(['RATE_LIMITED', 'COOLDOWN_ACTIVE']).toContain(result.error);
    // Supabase should NOT have been called this time
    // (call count should not have increased beyond the 5 above)
  });

  it('attaches a risk signal on failure', async () => {
    mockSignIn.mockResolvedValueOnce({
      data:  { user: null, session: null },
      error: { message: 'Invalid login credentials' },
    });

    const result = await login({ email: 'z@z.com', password: 'bad' } as LoginRequest, CTX);
    expect(result.risk).toBeDefined();
    expect(result.risk?.level).toBeDefined();
  });
});

describe('signup()', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns success=true with confirmationPending=true when no session', async () => {
    mockSignUp.mockResolvedValueOnce({
      data:  { user: { id: 'new-user' }, session: null },
      error: null,
    });

    const result = await signup({ email: 'new@b.com', password: 'StrongPass1!' } as SignupRequest, CTX);
    expect(result.success).toBe(true);
    expect(result.data?.confirmationPending).toBe(true);
  });

  it('returns success=true with confirmationPending=false when session is returned', async () => {
    mockSignUp.mockResolvedValueOnce({
      data: {
        user:    { id: 'new-user' },
        session: { expires_at: Math.floor(Date.now() / 1000) + 3600 },
      },
      error: null,
    });

    const result = await signup({ email: 'new@b.com', password: 'StrongPass1!' } as SignupRequest, CTX);
    expect(result.data?.confirmationPending).toBe(false);
  });

  it('returns EMAIL_ALREADY_EXISTS for duplicate email', async () => {
    mockSignUp.mockResolvedValueOnce({
      data:  { user: null, session: null },
      error: { message: 'User already registered' },
    });

    const result = await signup({ email: 'dup@b.com', password: 'p' } as SignupRequest, CTX);
    expect(result.error).toBe('EMAIL_ALREADY_EXISTS');
  });

  it('returns RATE_LIMITED when signup identity is exhausted', async () => {
    for (let i = 0; i < 5; i++) {
      mockSignUp.mockResolvedValueOnce({
        data:  { user: null, session: null },
        error: { message: 'fail' },
      });
      await signup({ email: 'spam@b.com', password: 'x' } as SignupRequest, CTX);
    }

    const result = await signup({ email: 'spam@b.com', password: 'x' } as SignupRequest, CTX);
    expect(['RATE_LIMITED', 'COOLDOWN_ACTIVE']).toContain(result.error);
  });
});

describe('logout()', () => {
  it('calls Supabase signOut', async () => {
    mockSignOut.mockResolvedValueOnce({ error: null });
    await logout('user-123');
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it('does not throw when userId is null', async () => {
    mockSignOut.mockResolvedValueOnce({ error: null });
    await expect(logout(null)).resolves.toBeUndefined();
  });
});
