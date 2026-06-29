import { renderHook, act } from '@testing-library/react-native';
import { useAuth } from '../hooks/use-auth';

beforeEach(() => {
  localStorage.clear();
});

describe('useAuth (mobile auth shell)', () => {
  it('starts with no authenticated user', () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.user).toBeNull();
    expect(result.current.accessToken).toBeNull();
  });

  it('recovers a stored session from localStorage', () => {
    const stored = {
      user: { id: '1', email: 'alice@test.com', role: 'USER' },
      accessToken: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.test',
    };
    localStorage.setItem('mixmatch.auth', JSON.stringify(stored));

    const { result } = renderHook(() => useAuth());
    expect(result.current.user?.email).toBe('alice@test.com');
    expect(result.current.accessToken).toBe(stored.accessToken);
  });

  it('clears a corrupted stored session', () => {
    localStorage.setItem('mixmatch.auth', '{corrupted');

    const { result } = renderHook(() => useAuth());
    expect(result.current.user).toBeNull();
    expect(result.current.accessToken).toBeNull();
  });

  it('setAuth persists and exposes the auth state', () => {
    const { result } = renderHook(() => useAuth());

    const auth: any = {
      user: { id: '2', email: 'bob@test.com', role: 'USER' },
      accessToken: 'token-abc',
    };

    act(() => result.current.setAuth(auth));
    expect(result.current.user?.email).toBe('bob@test.com');
    expect(result.current.accessToken).toBe('token-abc');
  });

  it('logout clears the auth state', () => {
    const { result } = renderHook(() => useAuth());

    act(() =>
      result.current.setAuth({
        user: { id: '3', email: 'carol@test.com', role: 'USER' },
        accessToken: 'token-xyz',
      }),
    );
    expect(result.current.user).not.toBeNull();

    act(() => result.current.logout());
    expect(result.current.user).toBeNull();
    expect(result.current.accessToken).toBeNull();
  });

  it('handles setAuth when localStorage is full', () => {
    const originalSetItem = Storage.prototype.setItem;
    jest.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
      throw new Error('QuotaExceededError');
    });

    const { result } = renderHook(() => useAuth());
    act(() =>
      result.current.setAuth({
        user: { id: '4', email: 'dave@test.com', role: 'USER' },
        accessToken: 'token-full',
      }),
    );

    expect(result.current.user?.email).toBe('dave@test.com');
    expect(result.current.accessToken).toBe('token-full');
  });
});
