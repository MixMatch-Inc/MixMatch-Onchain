import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PaymentsPage from './page';

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

const push = vi.fn();
const replace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace }),
}));

const mockSendPayment = vi.fn();
const mockGetTransactionHistory = vi.fn();

vi.mock('@/lib/payments-client', () => ({
  sendPayment: (...args: unknown[]) => mockSendPayment(...args),
  getTransactionHistory: (...args: unknown[]) => mockGetTransactionHistory(...args),
}));

let mockAuthValue: { user: { id: string; email: string } | null; accessToken: string | null };

vi.mock('@/lib/auth-context', () => ({
  useAuth: () => mockAuthValue,
}));

describe('PaymentsPage', () => {
  beforeEach(() => {
    push.mockReset();
    replace.mockReset();
    mockSendPayment.mockReset();
    mockGetTransactionHistory.mockReset();
    mockGetTransactionHistory.mockResolvedValue({ transactions: [], total: 0, page: 1, limit: 10 });
    mockAuthValue = { user: { id: 'user-1', email: 'a@b.com' }, accessToken: 'token-123' };
  });

  it('redirects to /login when unauthenticated', async () => {
    mockAuthValue = { user: null, accessToken: null };
    render(<PaymentsPage />);

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/login'));
  });

  it('loads and displays transaction history on mount', async () => {
    mockGetTransactionHistory.mockResolvedValue({ transactions: [TRANSACTION], total: 1, page: 1, limit: 10 });

    render(<PaymentsPage />);

    expect(await screen.findByText(VALID_PUBLIC_KEY)).toBeInTheDocument();
    expect(mockGetTransactionHistory).toHaveBeenCalledWith({ page: 1, limit: 10 }, 'token-123');
  });

  it('shows the empty state when there is no history yet', async () => {
    render(<PaymentsPage />);
    expect(await screen.findByText(/no transactions yet/i)).toBeInTheDocument();
  });

  it('submits a payment and navigates to the transaction detail page on success', async () => {
    mockSendPayment.mockResolvedValue({ transaction: TRANSACTION });
    render(<PaymentsPage />);

    await screen.findByText(/no transactions yet/i);

    await userEvent.type(screen.getByLabelText('Recipient address'), VALID_PUBLIC_KEY);
    await userEvent.type(screen.getByLabelText('Amount (XLM)'), '10');
    await userEvent.click(screen.getByRole('button', { name: 'Send payment' }));

    await waitFor(() => {
      expect(mockSendPayment).toHaveBeenCalledWith({ destinationPublicKey: VALID_PUBLIC_KEY, amount: '10' }, 'token-123');
    });
    expect(push).toHaveBeenCalledWith('/payments/tx-1');
  });

  it('shows a history load error without crashing the page', async () => {
    mockGetTransactionHistory.mockRejectedValue(new Error('Failed to reach the API'));
    render(<PaymentsPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to reach the API');
  });
});
