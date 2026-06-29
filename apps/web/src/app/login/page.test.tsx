import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { AuthProvider } from '@/lib/auth-context';
import LoginPage from './page';

function renderLoginPage() {
  return render(
    <AuthProvider>
      <LoginPage />
    </AuthProvider>,
  );
}

describe('LoginPage', () => {
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
});
