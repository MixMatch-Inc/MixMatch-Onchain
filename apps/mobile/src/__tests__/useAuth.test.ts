import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useAuth } from '../hooks/useAuth';

const AUTH: {
  user: { id: string; email: string; role: 'USER' | 'ADMIN'; createdAt: string; updatedAt: string };
  accessToken: string;
} = {
  user: {
    id: '1',
    email: 'alice@test.com',
    role: 'USER',
    emailVerified: true,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
  accessToken: 'token-abc',
};

describe('useAuth', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('starts with no authenticated user while loading, then resolves to null', async () => {
    const { result } = renderHook(() => useAuth());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.user).toBeNull();
    expect(result.current.accessToken).toBeNull();
  });

  it('restores a previously stored session', async () => {
    await AsyncStorage.setItem('mixmatch.auth', JSON.stringify(AUTH));

    const { result } = renderHook(() => useAuth());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.user?.email).toBe('alice@test.com');
    expect(result.current.accessToken).toBe('token-abc');
  });

  it('discards a corrupted stored session', async () => {
    await AsyncStorage.setItem('mixmatch.auth', '{not-json');

    const { result } = renderHook(() => useAuth());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.user).toBeNull();
  });

  it('setAuth persists and exposes the auth state', async () => {
    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.setAuth(AUTH));

    expect(result.current.user?.email).toBe('alice@test.com');
    expect(result.current.accessToken).toBe('token-abc');
    await waitFor(async () => {
      const stored = await AsyncStorage.getItem('mixmatch.auth');
      expect(stored).toBe(JSON.stringify(AUTH));
    });
  });

  it('logout clears the auth state and storage', async () => {
    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.setAuth(AUTH));
    expect(result.current.user).not.toBeNull();

    act(() => result.current.logout());

    expect(result.current.user).toBeNull();
    expect(result.current.accessToken).toBeNull();
    await waitFor(async () => {
      const stored = await AsyncStorage.getItem('mixmatch.auth');
      expect(stored).toBeNull();
    });
  });
});
