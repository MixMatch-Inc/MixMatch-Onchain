import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TransactionHistory } from '../TransactionHistory';

const TRANSACTION = {
  id: 'tx-1',
  idempotencyKey: 'key-1',
  stellarAccountId: 'account-1',
  destinationPublicKey: 'GBQEMWFEPUDYZ3NQOIFIW3WDGUJVOA2ABYZ66DSDDHMKYLIKFZ6OSILE',
  amount: '10',
  memo: null,
  status: 'SUCCESS' as const,
  stellarTxHash: 'abc123',
  failureCode: null,
  failureReason: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('TransactionHistory', () => {
  it('shows an empty state when there are no transactions', () => {
    render(<TransactionHistory transactions={[]} total={0} page={1} limit={10} onPageChange={vi.fn()} />);
    expect(screen.getByText(/no transactions yet/i)).toBeInTheDocument();
  });

  it('renders a row per transaction with a link to its detail page', () => {
    render(<TransactionHistory transactions={[TRANSACTION]} total={1} page={1} limit={10} onPageChange={vi.fn()} />);

    expect(screen.getByText(TRANSACTION.destinationPublicKey)).toBeInTheDocument();
    expect(screen.getByText('10 XLM')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View' })).toHaveAttribute('href', '/payments/tx-1');
  });

  it('hides pagination controls when everything fits on one page', () => {
    render(<TransactionHistory transactions={[TRANSACTION]} total={1} page={1} limit={10} onPageChange={vi.fn()} />);
    expect(screen.queryByRole('navigation', { name: 'Pagination' })).not.toBeInTheDocument();
  });

  it('shows pagination controls and disables Previous on the first page', () => {
    render(<TransactionHistory transactions={[TRANSACTION]} total={25} page={1} limit={10} onPageChange={vi.fn()} />);

    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled();
  });

  it('disables Next on the last page', () => {
    render(<TransactionHistory transactions={[TRANSACTION]} total={25} page={3} limit={10} onPageChange={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Previous' })).toBeEnabled();
  });

  it('calls onPageChange with the target page', async () => {
    const onPageChange = vi.fn();
    render(<TransactionHistory transactions={[TRANSACTION]} total={25} page={2} limit={10} onPageChange={onPageChange} />);

    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(onPageChange).toHaveBeenCalledWith(3);

    await userEvent.click(screen.getByRole('button', { name: 'Previous' }));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });
});
