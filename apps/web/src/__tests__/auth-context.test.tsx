import { render, screen, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../lib/auth-context';
import { type ReactNode } from 'react';

function TestConsumer() {
  const auth = useAuth();
  return (
    <div>
      <span data-testid="user">{auth.user?.email ?? 'null'}</span>
      <span data-testid="token">{auth.accessToken ?? 'null'}</span>
      <span data-testid="loading">{String(auth.isLoading)}</span>
      <button data-testid="logout" onClick={auth.logout}>
        Logout
      </button>
    </div>
  );
}

function renderWithProvider(ui: ReactNode) {
  return render(<AuthProvider>{ui}</AuthProvider>);
}

beforeEach(() => {
  localStorage.clear();
});

describe('AuthProvider (web auth shell edge cases)', () => {
  it('recovers a valid stored session', () => {
    const payload = btoa(JSON.stringify({ sub: '1', exp: Date.now() / 1000 + 3600 }));
    const token = `header.${payload}.sig`;
    localStorage.setItem(
      'mixmatch.auth',
      JSON.stringify({ user: { id: '1', email: 'alice@test.com', role: 'USER' }, accessToken: token }),
    );

    renderWithProvider(<TestConsumer />);
    expect(screen.getByTestId('user').textContent).toBe('alice@test.com');
  });

  it('discards an expired token on load', () => {
    const payload = btoa(JSON.stringify({ sub: '1', exp: Date.now() / 1000 - 3600 }));
    const token = `header.${payload}.sig`;
    localStorage.setItem(
      'mixmatch.auth',
      JSON.stringify({ user: { id: '1', email: 'alice@test.com', role: 'USER' }, accessToken: token }),
    );

    renderWithProvider(<TestConsumer />);
    expect(screen.getByTestId('user').textContent).toBe('null');
    expect(screen.getByTestId('token').textContent).toBe('null');
  });

  it('discards a malformed stored session', () => {
    localStorage.setItem('mixmatch.auth', '{corrupted');
    renderWithProvider(<TestConsumer />);
    expect(screen.getByTestId('user').textContent).toBe('null');
  });

  it('discards stored session missing user field', () => {
    localStorage.setItem('mixmatch.auth', JSON.stringify({ accessToken: 'abc' }));
    renderWithProvider(<TestConsumer />);
    expect(screen.getByTestId('user').textContent).toBe('null');
  });

  it('logout clears auth state', () => {
    const payload = btoa(JSON.stringify({ sub: '1', exp: Date.now() / 1000 + 3600 }));
    const token = `header.${payload}.sig`;
    localStorage.setItem(
      'mixmatch.auth',
      JSON.stringify({ user: { id: '1', email: 'alice@test.com', role: 'USER' }, accessToken: token }),
    );

    renderWithProvider(<TestConsumer />);
    expect(screen.getByTestId('user').textContent).toBe('alice@test.com');

    act(() => screen.getByTestId('logout').click());
    expect(screen.getByTestId('user').textContent).toBe('null');
    expect(screen.getByTestId('token').textContent).toBe('null');
  });
});
