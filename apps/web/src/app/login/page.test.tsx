import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AuthProvider } from '@/lib/auth-context';
import LoginPage from './page';

const { mockUser } = vi.hoisted(() => ({
  mockUser: {
    id: '1',
    email: 'test@example.com',
    role: 'USER',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
}));

vi.mock('@/lib/api-client', () => ({
  loginUser: vi.fn(),
  // auth-context re-validates any stored session on mount via getCurrentUser;
  // resolve with the same user the tests seed into localStorage so the
  // logged-in-state assertions (which run synchronously, before this promise
  // settles) aren't followed by an async clear-on-reject state update.
  getCurrentUser: vi.fn().mockResolvedValue({ user: mockUser }),
}));

function renderLoginPage() {
  return render(
    <AuthProvider>
      <LoginPage />
    </AuthProvider>,
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('renders the login form', () => {
    renderLoginPage();

    expect(screen.getByRole('heading', { name: 'Log in' })).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Log in' })).toBeInTheDocument();
  });

  it('shows a validation error for an invalid email', async () => {
    renderLoginPage();

    await userEvent.type(screen.getByLabelText('Email'), 'not-an-email');
    await userEvent.type(screen.getByLabelText('Password'), 'password123');
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/valid email/i);
    });
  });

  it('renders the signup link', () => {
    renderLoginPage();

    expect(screen.getByRole('link', { name: /create one/i })).toHaveAttribute('href', '/signup');
  });

  it('renders logged-in state when user is authenticated', () => {
    const auth = { user: mockUser, accessToken: 'token' };
    window.localStorage.setItem('mixmatch.auth', JSON.stringify(auth));

    renderLoginPage();

    expect(screen.getByText('You are logged in')).toBeInTheDocument();
    expect(screen.getByText(/signed in as test@example.com/i)).toBeInTheDocument();
  });

  it('renders a logout button when authenticated', () => {
    const auth = { user: mockUser, accessToken: 'token' };
    window.localStorage.setItem('mixmatch.auth', JSON.stringify(auth));

    renderLoginPage();

    expect(screen.getByRole('button', { name: /log out/i })).toBeInTheDocument();
  });

  it('handles corrupted localStorage gracefully', () => {
    window.localStorage.setItem('mixmatch.auth', 'not-json');

    renderLoginPage();

    expect(screen.getByRole('heading', { name: 'Log in' })).toBeInTheDocument();
  });
});
