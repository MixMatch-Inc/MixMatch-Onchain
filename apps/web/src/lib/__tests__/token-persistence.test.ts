import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, beforeEach } from 'vitest';
import { AuthProvider, useAuth } from '../auth-context';

function createStoredAuth(overrides: Record<string, unknown> = {}) {
  return {
    user: { id: '1', email: 'alice@test.com', role: 'USER', createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
    accessToken: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.test',
    refreshToken: 'refresh-token-123',
    ...overrides,
  };
}

describe('Token persistence — core flow', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('stores auth data to localStorage on setAuth', () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    const auth = createStoredAuth();

    act(() => result.current.setAuth(auth));

    const stored = JSON.parse(window.localStorage.getItem('mixmatch.auth')!);
    expect(stored.user.email).toBe('alice@test.com');
    expect(stored.accessToken).toBe(auth.accessToken);
  });

  it('restores auth from localStorage on mount', () => {
    const auth = createStoredAuth();
    window.localStorage.setItem('mixmatch.auth', JSON.stringify(auth));

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    expect(result.current.user?.email).toBe('alice@test.com');
    expect(result.current.accessToken).toBe(auth.accessToken);
  });

  it('clears localStorage on logout', () => {
    const auth = createStoredAuth();
    window.localStorage.setItem('mixmatch.auth', JSON.stringify(auth));

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    act(() => result.current.logout());

    expect(window.localStorage.getItem('mixmatch.auth')).toBeNull();
  });

  it('handles corrupted localStorage gracefully', () => {
    window.localStorage.setItem('mixmatch.auth', '{corrupted');

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    expect(result.current.user).toBeNull();
    expect(result.current.accessToken).toBeNull();
  });

  it('handles missing user field in stored data', () => {
    window.localStorage.setItem('mixmatch.auth', JSON.stringify({ accessToken: 'token' }));

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    expect(result.current.user).toBeNull();
  });

  it('handles missing accessToken field in stored data', () => {
    window.localStorage.setItem('mixmatch.auth', JSON.stringify({ user: { id: '1' } }));

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    expect(result.current.accessToken).toBeNull();
  });

  it('discards expired token on mount', () => {
    const payload = btoa(JSON.stringify({ sub: '1', exp: Date.now() / 1000 - 3600 }));
    const token = `header.${payload}.sig`;
    const auth = createStoredAuth({ accessToken: token });
    window.localStorage.setItem('mixmatch.auth', JSON.stringify(auth));

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    expect(result.current.user).toBeNull();
    expect(window.localStorage.getItem('mixmatch.auth')).toBeNull();
  });

  it('preserves auth data when localStorage write fails', () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    const originalSetItem = window.localStorage.setItem;
    window.localStorage.setItem = () => { throw new Error('QuotaExceededError'); };

    act(() => result.current.setAuth(createStoredAuth()));

    // In-memory state should still be set
    expect(result.current.user?.email).toBe('alice@test.com');

    window.localStorage.setItem = originalSetItem;
  });

  it('setAuth overwrites previous stored data', () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    act(() => result.current.setAuth(createStoredAuth({ user: { id: '1', email: 'alice@test.com', role: 'USER', createdAt: '', updatedAt: '' } })));
    act(() => result.current.setAuth(createStoredAuth({ user: { id: '2', email: 'bob@test.com', role: 'USER', createdAt: '', updatedAt: '' } })));

    const stored = JSON.parse(window.localStorage.getItem('mixmatch.auth')!);
    expect(stored.user.email).toBe('bob@test.com');
  });

  it('handles empty localStorage value', () => {
    window.localStorage.setItem('mixmatch.auth', '');

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    expect(result.current.user).toBeNull();
  });

  it('handles non-object JSON in localStorage', () => {
    window.localStorage.setItem('mixmatch.auth', '"just-a-string"');

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    expect(result.current.user).toBeNull();
  });
});
