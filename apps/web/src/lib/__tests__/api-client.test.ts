import { describe, expect, it, vi, beforeEach } from 'vitest';
import { loginUser, registerUser, ApiError } from '../api-client';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('api-client', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe('loginUser', () => {
    it('returns auth response on successful login', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: { id: '1', email: 'a@b.com', role: 'USER', createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
          accessToken: 'token-123',
        }),
      });

      const result = await loginUser({ email: 'a@b.com', password: 'secret' });

      expect(result.accessToken).toBe('token-123');
      expect(result.user.email).toBe('a@b.com');
    });

    it('throws ApiError on failed login', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: { message: 'Invalid credentials' } }),
      });

      await expect(loginUser({ email: 'a@b.com', password: 'wrong' })).rejects.toThrow(ApiError);
    });

    it('throws ApiError with the server error message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: { message: 'Invalid credentials' } }),
      });

      await expect(loginUser({ email: 'a@b.com', password: 'wrong' })).rejects.toThrow('Invalid credentials');
    });

    it('throws ApiError with fallback message when no error message is returned', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      });

      await expect(loginUser({ email: 'a@b.com', password: 'wrong' })).rejects.toThrow('Something went wrong');
    });
  });

  describe('registerUser', () => {
    it('returns auth response on successful registration', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: { id: '2', email: 'new@example.com', role: 'USER', createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
          accessToken: 'token-456',
        }),
      });

      const result = await registerUser({ email: 'new@example.com', password: 'password123' });

      expect(result.accessToken).toBe('token-456');
    });

    it('throws ApiError on failed registration', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: { message: 'Email already in use' } }),
      });

      await expect(registerUser({ email: 'existing@example.com', password: 'password123' })).rejects.toThrow('Email already in use');
    });
  });
});
