import { renderHook, act, waitFor } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '../context/AuthContext';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const secureStoreMock = require('expo-secure-store');

beforeEach(() => {
  secureStoreMock.__reset();
  jest.clearAllMocks();
});

function renderAuth() {
  return renderHook(() => useAuth(), { wrapper: AuthProvider });
}

const user = { id: '1', email: 'alice@test.com', role: 'USER', createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' };

describe('AuthContext (mobile)', () => {
  it('starts loading, then resolves with no authenticated user', async () => {
    const { result } = renderAuth();
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.user).toBeNull();
    expect(result.current.accessToken).toBeNull();
  });

  it('recovers a stored session from SecureStore', async () => {
    await secureStoreMock.setItemAsync('mixmatch.auth', JSON.stringify({ user, accessToken: 'token-abc' }));

    const { result } = renderAuth();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.user?.email).toBe('alice@test.com');
    expect(result.current.accessToken).toBe('token-abc');
  });

  it('clears a corrupted stored session', async () => {
    await secureStoreMock.setItemAsync('mixmatch.auth', '{corrupted');

    const { result } = renderAuth();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.user).toBeNull();
    expect(await secureStoreMock.getItemAsync('mixmatch.auth')).toBeNull();
  });

  it('setAuth persists to SecureStore and exposes the auth state', async () => {
    const { result } = renderAuth();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.setAuth({ user, accessToken: 'token-xyz' });
    });

    expect(result.current.user?.email).toBe('alice@test.com');
    expect(result.current.accessToken).toBe('token-xyz');
    expect(await secureStoreMock.getItemAsync('mixmatch.auth')).toContain('token-xyz');
  });

  it('logout clears both state and SecureStore', async () => {
    const { result } = renderAuth();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.setAuth({ user, accessToken: 'token-xyz' });
    });
    expect(result.current.user).not.toBeNull();

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.accessToken).toBeNull();
    expect(await secureStoreMock.getItemAsync('mixmatch.auth')).toBeNull();
  });

  it('throws when useAuth is called outside an AuthProvider', () => {
    const { result } = renderHook(() => {
      try {
        return useAuth();
      } catch (err) {
        return err;
      }
    });
    expect(result.current).toBeInstanceOf(Error);
  });
});
