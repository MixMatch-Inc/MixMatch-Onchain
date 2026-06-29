import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { AuthProvider } from '@/lib/auth-context';
import SignupPage from './page';

function renderSignupPage() {
  return render(
    <AuthProvider>
      <SignupPage />
    </AuthProvider>,
  );
}

describe('SignupPage', () => {
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
});
