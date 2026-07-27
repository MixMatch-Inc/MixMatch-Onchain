import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TransactionStatus } from '../TransactionStatus';

const BASE = {
  id: 'tx-1',
  idempotencyKey: 'key-1',
  stellarAccountId: 'account-1',
  destinationPublicKey: 'GBQEMWFEPUDYZ3NQOIFIW3WDGUJVOA2ABYZ66DSDDHMKYLIKFZ6OSILE',
  amount: '10',
  memo: null,
  stellarTxHash: null,
  failureCode: null,
  failureReason: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('TransactionStatus', () => {
  it('renders a pending transaction', () => {
    render(<TransactionStatus transaction={{ ...BASE, status: 'PENDING' }} />);

    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText(BASE.destinationPublicKey)).toBeInTheDocument();
    expect(screen.getByText('10 XLM')).toBeInTheDocument();
  });

  it('renders a successful transaction with its tx hash', () => {
    render(<TransactionStatus transaction={{ ...BASE, status: 'SUCCESS', stellarTxHash: 'abc123' }} />);

    expect(screen.getByText('Success')).toBeInTheDocument();
    expect(screen.getByText('Transaction hash')).toBeInTheDocument();
    expect(screen.getByText('abc123')).toBeInTheDocument();
  });

  it('renders a failed transaction with its failure reason as an alert', () => {
    render(
      <TransactionStatus
        transaction={{ ...BASE, status: 'FAILED', failureCode: 'insufficient_balance', failureReason: 'Not enough funds' }}
      />,
    );

    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Not enough funds');
  });

  it('renders the memo when present', () => {
    render(<TransactionStatus transaction={{ ...BASE, status: 'SUCCESS', memo: 'invoice-42' }} />);
    expect(screen.getByText('invoice-42')).toBeInTheDocument();
  });

  it('does not render a memo row when memo is null', () => {
    render(<TransactionStatus transaction={{ ...BASE, status: 'SUCCESS' }} />);
    expect(screen.queryByText('Memo')).not.toBeInTheDocument();
  });
});
