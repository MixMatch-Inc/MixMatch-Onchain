import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PaymentForm } from '../PaymentForm';

const VALID_PUBLIC_KEY = 'GBQEMWFEPUDYZ3NQOIFIW3WDGUJVOA2ABYZ66DSDDHMKYLIKFZ6OSILE';

const TRANSACTION = {
  id: 'tx-1',
  idempotencyKey: 'key-1',
  stellarAccountId: 'account-1',
  destinationPublicKey: VALID_PUBLIC_KEY,
  amount: '10',
  memo: null,
  status: 'PENDING' as const,
  stellarTxHash: null,
  failureCode: null,
  failureReason: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('PaymentForm', () => {
  it('renders the form fields', () => {
    render(<PaymentForm onSubmit={vi.fn()} />);

    expect(screen.getByLabelText('Recipient address')).toBeInTheDocument();
    expect(screen.getByLabelText('Amount (XLM)')).toBeInTheDocument();
    expect(screen.getByLabelText('Memo (optional)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send payment' })).toBeInTheDocument();
  });

  it('shows a validation error for a malformed destination address', async () => {
    render(<PaymentForm onSubmit={vi.fn()} />);

    await userEvent.type(screen.getByLabelText('Recipient address'), 'not-a-real-key');
    await userEvent.type(screen.getByLabelText('Amount (XLM)'), '10');
    await userEvent.click(screen.getByRole('button', { name: 'Send payment' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/valid stellar public key/i);
    });
  });

  it('shows a validation error for a zero amount', async () => {
    render(<PaymentForm onSubmit={vi.fn()} />);

    await userEvent.type(screen.getByLabelText('Recipient address'), VALID_PUBLIC_KEY);
    await userEvent.type(screen.getByLabelText('Amount (XLM)'), '0');
    await userEvent.click(screen.getByRole('button', { name: 'Send payment' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/greater than zero/i);
    });
  });

  it('calls onSubmit with the parsed values and onSuccess with the result', async () => {
    const onSubmit = vi.fn().mockResolvedValue(TRANSACTION);
    const onSuccess = vi.fn();

    render(<PaymentForm onSubmit={onSubmit} onSuccess={onSuccess} />);

    await userEvent.type(screen.getByLabelText('Recipient address'), VALID_PUBLIC_KEY);
    await userEvent.type(screen.getByLabelText('Amount (XLM)'), '10');
    await userEvent.type(screen.getByLabelText('Memo (optional)'), 'invoice-1');
    await userEvent.click(screen.getByRole('button', { name: 'Send payment' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        destinationPublicKey: VALID_PUBLIC_KEY,
        amount: '10',
        memo: 'invoice-1',
      });
    });
    expect(onSuccess).toHaveBeenCalledWith(TRANSACTION);
  });

  it('clears the form after a successful submission', async () => {
    const onSubmit = vi.fn().mockResolvedValue(TRANSACTION);
    render(<PaymentForm onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText('Recipient address'), VALID_PUBLIC_KEY);
    await userEvent.type(screen.getByLabelText('Amount (XLM)'), '10');
    await userEvent.click(screen.getByRole('button', { name: 'Send payment' }));

    await waitFor(() => {
      expect(screen.getByLabelText('Recipient address')).toHaveValue('');
    });
    expect(screen.getByLabelText('Amount (XLM)')).toHaveValue('');
  });

  it('shows a submission error and keeps the form values when onSubmit rejects', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('Insufficient balance'));
    render(<PaymentForm onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText('Recipient address'), VALID_PUBLIC_KEY);
    await userEvent.type(screen.getByLabelText('Amount (XLM)'), '10');
    await userEvent.click(screen.getByRole('button', { name: 'Send payment' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Insufficient balance');
    });
    expect(screen.getByLabelText('Recipient address')).toHaveValue(VALID_PUBLIC_KEY);
  });

  it('disables the submit button while submitting', async () => {
    let resolveSubmit!: (value: typeof TRANSACTION) => void;
    const onSubmit = vi.fn(
      () =>
        new Promise<typeof TRANSACTION>((resolve) => {
          resolveSubmit = resolve;
        }),
    );
    render(<PaymentForm onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText('Recipient address'), VALID_PUBLIC_KEY);
    await userEvent.type(screen.getByLabelText('Amount (XLM)'), '10');
    await userEvent.click(screen.getByRole('button', { name: 'Send payment' }));

    expect(await screen.findByRole('button', { name: /sending/i })).toBeDisabled();

    await act(async () => {
      resolveSubmit(TRANSACTION);
      await Promise.resolve();
    });
  });
});
