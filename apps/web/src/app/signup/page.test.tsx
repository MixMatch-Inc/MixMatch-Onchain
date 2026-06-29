import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { beforeEach, describe, expect, it } from 'vitest';
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

  it('renders the login link', () => {
    renderSignupPage();

    expect(screen.getByRole('link', { name: /log in/i })).toHaveAttribute('href', '/login');
  });

  it('renders account-created state when user is authenticated', () => {
    const auth = { user: { id: '1', email: 'new@example.com', role: 'USER', createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' }, accessToken: 'token' };
    window.localStorage.setItem('mixmatch.auth', JSON.stringify(auth));

    renderSignupPage();

    expect(screen.getByText('Account created')).toBeInTheDocument();
    expect(screen.getByText(/signed in as new@example.com/i)).toBeInTheDocument();
  });
});
