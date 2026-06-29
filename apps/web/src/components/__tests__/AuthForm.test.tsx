import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AuthForm } from '../AuthForm';

describe('AuthForm', () => {
  it('renders with the provided title and submit label', () => {
    render(<AuthForm title="Log in" submitLabel="Log in" onSubmit={async () => {}} />);

    expect(screen.getByRole('heading', { name: 'Log in' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Log in' })).toBeInTheDocument();
  });

  it('disables the submit button while submitting', async () => {
    const onSubmit = vi.fn().mockImplementation(() => new Promise<void>((resolve) => setTimeout(resolve, 100)));

    render(<AuthForm title="Log in" submitLabel="Log in" onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText('Email'), 'user@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'password123');
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));

    expect(screen.getByRole('button', { name: /please wait/i })).toBeDisabled();
  });

  it('shows an API error message when onSubmit throws', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('Invalid credentials'));

    render(<AuthForm title="Log in" submitLabel="Log in" onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText('Email'), 'user@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Invalid credentials');
    });
  });

  it('shows a generic error for non-Error rejections', async () => {
    const onSubmit = vi.fn().mockRejectedValue('string error');

    render(<AuthForm title="Log in" submitLabel="Log in" onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText('Email'), 'user@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'password123');
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong');
    });
  });

  it('displays field-level errors when fieldErrors prop is provided', () => {
    render(
      <AuthForm
        title="Log in"
        submitLabel="Log in"
        onSubmit={async () => {}}
        fieldErrors={{ email: 'Email is required', password: 'Password is too short' }}
      />,
    );

    expect(screen.getByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Password is too short')).toBeInTheDocument();
  });

  it('re-enables the submit button after a failed submission', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('Server error'));

    render(<AuthForm title="Log in" submitLabel="Log in" onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText('Email'), 'user@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'password123');
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Log in' })).not.toBeDisabled();
    });
  });

  it('accepts empty initial values', () => {
    render(<AuthForm title="Log in" submitLabel="Log in" onSubmit={async () => {}} />);

    expect(screen.getByLabelText('Email')).toHaveValue('');
    expect(screen.getByLabelText('Password')).toHaveValue('');
  });
});
