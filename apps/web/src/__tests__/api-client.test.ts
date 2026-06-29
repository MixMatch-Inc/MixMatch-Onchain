import { describe, expect, it, vi, beforeEach } from 'vitest';
import { me } from '../lib/api-client';

const API_URL = 'http://localhost:3001';

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('api-client me()', () => {
  it('calls GET /api/auth/me with the correct auth header', async () => {
    const mockUser = { id: '1', email: 'alice@test.com', role: 'USER', createdAt: '', updatedAt: '' };
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: mockUser }),
    } as Response);

    const result = await me('token-abc');
    expect(result.email).toBe('alice@test.com');
    expect(fetch).toHaveBeenCalledWith(`${API_URL}/api/auth/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token-abc',
      },
    });
  });

  it('throws ApiError on non-ok response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: { message: 'Token expired' } }),
    } as Response);

    await expect(me('bad-token')).rejects.toThrow('Token expired');
  });

  it('throws ApiError on network failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network error'));

    await expect(me('token-abc')).rejects.toThrow('Network error');
  });
});
