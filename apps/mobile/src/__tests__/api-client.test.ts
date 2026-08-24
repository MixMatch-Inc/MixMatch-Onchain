import { ApiError, authHeaders, request } from '../services/api-client';

describe('api-client', () => {
  it('returns parsed JSON on success', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ hello: 'world' }),
    }) as unknown as typeof fetch;

    const result = await request<{ hello: string }>('/ping');

    expect(result).toEqual({ hello: 'world' });
  });

  it('throws an ApiError with the server message on failure', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ message: 'Invalid credentials', code: 'UNAUTHORIZED' }),
    }) as unknown as typeof fetch;

    await expect(request('/auth/login')).rejects.toMatchObject({
      message: 'Invalid credentials',
      code: 'UNAUTHORIZED',
    });
  });

  it('uses the first message when the server returns an array (class-validator style)', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ message: ['email must be an email', 'password too short'] }),
    }) as unknown as typeof fetch;

    await expect(request('/auth/register')).rejects.toBeInstanceOf(ApiError);
    await expect(request('/auth/register')).rejects.toMatchObject({ message: 'email must be an email' });
  });

  it('falls back to a generic message when the error body has no message', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve(undefined),
    }) as unknown as typeof fetch;

    await expect(request('/broken')).rejects.toMatchObject({ message: 'Something went wrong' });
  });

  it('builds a Bearer authorization header', () => {
    expect(authHeaders('tok-123')).toEqual({ Authorization: 'Bearer tok-123' });
  });
});
