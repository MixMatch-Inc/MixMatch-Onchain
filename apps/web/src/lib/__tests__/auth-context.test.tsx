import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, beforeEach } from 'vitest';
import { AuthProvider, useAuth } from '@/lib/auth-context';

const STORAGE_KEY = 'mixmatch.auth';

const mockUser = {
  id: '1',
  email: 'test@example.com',
  role: 'USER',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function TestConsumer() {
  const { user, accessToken, isLoading, setAuth, logout } = useAuth();

  if (isLoading) return <div>loading...</div>;

  return (
    <div>
      <div data-testid="user">{user?.email ?? 'not logged in'}</div>
      <div data-testid="token">{accessToken ?? 'none'}</div>
      <button onClick={() => setAuth({ user: mockUser, accessToken: 'test-token' })}>
        set auth
      </button>
      <button onClick={logout}>log out</button>
    </div>
  );
}

function renderWithProvider() {
  return render(
    <AuthProvider>
      <TestConsumer />
    </AuthProvider>,
  );
}

describe('AuthProvider — token persistence', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('shows logged-out state when localStorage is empty', async () => {
    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('not logged in');
      expect(screen.getByTestId('token')).toHaveTextContent('none');
    });
  });

  it('hydrates user and accessToken from localStorage on mount', async () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ user: mockUser, accessToken: 'stored-token' }),
    );

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
      expect(screen.getByTestId('token')).toHaveTextContent('stored-token');
    });
  });

  it('handles corrupted localStorage gracefully', async () => {
    window.localStorage.setItem(STORAGE_KEY, 'not-valid-json');

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('not logged in');
      expect(screen.getByTestId('token')).toHaveTextContent('none');
      expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    });
  });

  it('setAuth persists to localStorage and updates context', async () => {
    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('not logged in');
    });

    await userEvent.click(screen.getByRole('button', { name: 'set auth' }));

    expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
    expect(screen.getByTestId('token')).toHaveTextContent('test-token');

    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY)!);
    expect(stored.user.email).toBe('test@example.com');
    expect(stored.accessToken).toBe('test-token');
  });

  it('logout removes auth from localStorage and context', async () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ user: mockUser, accessToken: 'stored-token' }),
    );

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId('token')).toHaveTextContent('stored-token');
    });

    await userEvent.click(screen.getByRole('button', { name: 'log out' }));

    expect(screen.getByTestId('user')).toHaveTextContent('not logged in');
    expect(screen.getByTestId('token')).toHaveTextContent('none');
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
