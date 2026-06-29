import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AuthProvider } from '@/lib/auth-context';
import { registerUser } from '@/lib/api-client';
import SignupPage from './page';

vi.mock('@/lib/api-client', () => ({
  registerUser: vi.fn(),
}));

function renderSignupPage() {
  return render(
    <AuthProvider>
      <SignupPage />
    </AuthProvider>,
  );
}

describe('SignupPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it('renders the signup form', () => {
    renderSignupPage();

    expect(screen.getByRole('heading', { name: 'Create account' })).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create account' })).toBeInTheDocument();
  });

  it('shows a validation error for a password that is too short', async () => {
    renderSignupPage();

    await userEvent.type(screen.getByLabelText('Email'), 'user@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'short');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/at least 8 characters/i);
    });
  });

  it('shows a validation error for an invalid email', async () => {
    renderSignupPage();

    await userEvent.type(screen.getByLabelText('Email'), 'not-an-email');
    await userEvent.type(screen.getByLabelText('Password'), 'password123');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/valid email/i);
    });
  });

  it('displays a loading state while submitting', async () => {
    let resolvePromise!: (value: unknown) => void;
    const registerMock = vi.mocked(registerUser);
    registerMock.mockReturnValue(new Promise((resolve) => { resolvePromise = resolve; }));

    renderSignupPage();
    await userEvent.type(screen.getByLabelText('Email'), 'user@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'password123');

    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(screen.getByRole('button', { name: /please wait/i })).toBeDisabled();
    resolvePromise({ user: { id: '1', email: 'user@example.com', role: 'USER', createdAt: '', updatedAt: '' }, accessToken: 'token' });
  });

  it('shows an API error from a failed registration', async () => {
    vi.mocked(registerUser).mockRejectedValue(new Error('Email already in use'));

    renderSignupPage();
    await userEvent.type(screen.getByLabelText('Email'), 'used@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'password123');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/email already in use/i);
    });
  });

  it('shows a generic error for network failures', async () => {
    vi.mocked(registerUser).mockRejectedValue(new TypeError('Failed to fetch'));

    renderSignupPage();
    await userEvent.type(screen.getByLabelText('Email'), 'user@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'password123');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/failed to fetch/i);
    });
  });

  it('shows account created state after successful registration', async () => {
    vi.mocked(registerUser).mockResolvedValue({
      user: { id: '1', email: 'new@example.com', role: 'USER', createdAt: '', updatedAt: '' },
      accessToken: 'test-token',
    });

    renderSignupPage();
    await userEvent.type(screen.getByLabelText('Email'), 'new@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'password123');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => {
      expect(screen.getByText(/account created/i)).toBeInTheDocument();
      expect(screen.getByText(/signed in as new@example.com/i)).toBeInTheDocument();
    });
  });
});
