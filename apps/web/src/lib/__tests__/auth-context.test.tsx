import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, beforeEach } from 'vitest';
import { AuthProvider, useAuth } from '../auth-context';

describe('AuthProvider', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('has no user and no token by default after loading', () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    expect(result.current.user).toBeNull();
    expect(result.current.accessToken).toBeNull();
  });

  it('setAuth stores user and token in state and localStorage', () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    const authData = {
      user: { id: '1', email: 'a@b.com', role: 'USER', createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
      accessToken: 'test-token',
    };

    act(() => {
      result.current.setAuth(authData);
    });

    expect(result.current.user?.email).toBe('a@b.com');
    expect(result.current.accessToken).toBe('test-token');

    const stored = JSON.parse(window.localStorage.getItem('mixmatch.auth')!);
    expect(stored.user.email).toBe('a@b.com');
    expect(stored.accessToken).toBe('test-token');
  });

  it('logout clears user and token from state and localStorage', () => {
    const authData = {
      user: { id: '1', email: 'a@b.com', role: 'USER', createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
      accessToken: 'test-token',
    };
    window.localStorage.setItem('mixmatch.auth', JSON.stringify(authData));

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    act(() => {
      result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.accessToken).toBeNull();
    expect(window.localStorage.getItem('mixmatch.auth')).toBeNull();
  });

  it('throws an error when useAuth is used outside of AuthProvider', () => {
    expect(() => renderHook(() => useAuth())).toThrow('useAuth must be used within an AuthProvider');
  });

  it('restores auth from localStorage on mount', () => {
    const authData = {
      user: { id: '1', email: 'stored@example.com', role: 'USER', createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
      accessToken: 'stored-token',
    };
    window.localStorage.setItem('mixmatch.auth', JSON.stringify(authData));

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    expect(result.current.user?.email).toBe('stored@example.com');
  });
});
