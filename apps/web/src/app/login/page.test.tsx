import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AuthProvider } from '@/lib/auth-context';
import { loginUser } from '@/lib/api-client';
import LoginPage from './page';

vi.mock('@/lib/api-client', () => ({
  loginUser: vi.fn(),
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
    vi.clearAllMocks();
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

  it('shows a validation error when password is empty', async () => {
    renderLoginPage();

    await userEvent.type(screen.getByLabelText('Email'), 'user@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/password is required/i);
    });
  });

  it('displays a loading state while submitting', async () => {
    let resolvePromise!: (value: unknown) => void;
    vi.mocked(loginUser).mockReturnValue(new Promise((resolve) => { resolvePromise = resolve; }));

    renderLoginPage();
    await userEvent.type(screen.getByLabelText('Email'), 'user@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'password123');
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));

    expect(screen.getByRole('button', { name: /please wait/i })).toBeDisabled();
    resolvePromise({ user: { id: '1', email: 'user@example.com', role: 'USER', createdAt: '', updatedAt: '' }, accessToken: 'token' });
  });

  it('shows an API error for invalid credentials', async () => {
    vi.mocked(loginUser).mockRejectedValue(new Error('Invalid email or password'));

    renderLoginPage();
    await userEvent.type(screen.getByLabelText('Email'), 'wrong@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'wrongpassword');
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/invalid email or password/i);
    });
  });

  it('shows a generic error for network failures', async () => {
    vi.mocked(loginUser).mockRejectedValue(new TypeError('Failed to fetch'));

    renderLoginPage();
    await userEvent.type(screen.getByLabelText('Email'), 'user@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'password123');
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/failed to fetch/i);
    });
  });

  it('shows logged-in state after successful login', async () => {
    vi.mocked(loginUser).mockResolvedValue({
      user: { id: '1', email: 'user@example.com', role: 'USER', createdAt: '', updatedAt: '' },
      accessToken: 'test-token',
    });

    renderLoginPage();
    await userEvent.type(screen.getByLabelText('Email'), 'user@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'password123');
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));

    await waitFor(() => {
      expect(screen.getByText(/you are logged in/i)).toBeInTheDocument();
      expect(screen.getByText(/signed in as user@example.com/i)).toBeInTheDocument();
    });
  });
});
