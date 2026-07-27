import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TransactionDetailPage from './page';

const PENDING_TX = {
  id: 'tx-1',
  idempotencyKey: 'key-1',
  stellarAccountId: 'account-1',
  destinationPublicKey: 'GBQEMWFEPUDYZ3NQOIFIW3WDGUJVOA2ABYZ66DSDDHMKYLIKFZ6OSILE',
  amount: '10',
  memo: null,
  status: 'PENDING' as const,
  stellarTxHash: null,
  failureCode: null,
  failureReason: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const SUCCESS_TX = { ...PENDING_TX, status: 'SUCCESS' as const, stellarTxHash: 'abc123' };

const replace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  useParams: () => ({ id: 'tx-1' }),
}));

const mockGetTransactionStatus = vi.fn();

vi.mock('@/lib/payments-client', () => ({
  getTransactionStatus: (...args: unknown[]) => mockGetTransactionStatus(...args),
}));

let mockAuthValue: { user: { id: string; email: string } | null; accessToken: string | null };

vi.mock('@/lib/auth-context', () => ({
  useAuth: () => mockAuthValue,
}));

describe('TransactionDetailPage', () => {
  beforeEach(() => {
    replace.mockReset();
    mockGetTransactionStatus.mockReset();
    mockAuthValue = { user: { id: 'user-1', email: 'a@b.com' }, accessToken: 'token-123' };
  });

  it('redirects to /login when unauthenticated', async () => {
    mockAuthValue = { user: null, accessToken: null };
    render(<TransactionDetailPage />);

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/login'));
  });

  it('shows a loading state before the first status response resolves', () => {
    mockGetTransactionStatus.mockReturnValue(new Promise(() => {}));
    render(<TransactionDetailPage />);
    expect(screen.getByText(/loading transaction status/i)).toBeInTheDocument();
  });

  it('renders the transaction once loaded', async () => {
    mockGetTransactionStatus.mockResolvedValue({ transaction: PENDING_TX });
    render(<TransactionDetailPage />);

    expect(await screen.findByText('Pending')).toBeInTheDocument();
    expect(mockGetTransactionStatus).toHaveBeenCalledWith('tx-1', 'token-123');
  });

  it('renders a terminal SUCCESS status with its tx hash', async () => {
    mockGetTransactionStatus.mockResolvedValue({ transaction: SUCCESS_TX });
    render(<TransactionDetailPage />);

    expect(await screen.findByText('Success')).toBeInTheDocument();
    expect(screen.getByText('abc123')).toBeInTheDocument();
  });

  it('shows an error message when the status request fails', async () => {
    mockGetTransactionStatus.mockRejectedValue(new Error('Transaction not found'));
    render(<TransactionDetailPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Transaction not found');
  });

  it('has a back link to the payments page', async () => {
    mockGetTransactionStatus.mockResolvedValue({ transaction: PENDING_TX });
    render(<TransactionDetailPage />);

    await screen.findByText('Pending');
    expect(screen.getByRole('link', { name: /back to payments/i })).toHaveAttribute('href', '/payments');
  });
});
