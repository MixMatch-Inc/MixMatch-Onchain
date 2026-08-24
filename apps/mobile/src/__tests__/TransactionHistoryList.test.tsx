import type { TransactionRecord } from '@mixmatch/shared';
import { render, screen } from '@testing-library/react-native';
import TransactionHistoryList from '../components/TransactionHistoryList';

function buildTransaction(overrides: Partial<TransactionRecord> = {}): TransactionRecord {
  return {
    id: 'tx-1',
    idempotencyKey: 'key-1',
    stellarAccountId: 'acct-1',
    destinationPublicKey: 'G'.padEnd(56, 'A'),
    amount: '10',
    memo: null,
    status: 'SUCCESS',
    stellarTxHash: 'hash',
    failureCode: null,
    failureReason: null,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('TransactionHistoryList', () => {
  it('shows an empty state with no transactions', () => {
    render(<TransactionHistoryList transactions={[]} />);
    expect(screen.getByText('No transactions yet')).toBeTruthy();
  });

  it('renders each transaction row', () => {
    const transactions = [buildTransaction({ id: 'tx-1' }), buildTransaction({ id: 'tx-2', status: 'PENDING' })];
    render(<TransactionHistoryList transactions={transactions} />);

    expect(screen.getByTestId('transaction-tx-1')).toBeTruthy();
    expect(screen.getByTestId('transaction-tx-2')).toBeTruthy();
  });

  it('renders the memo when present', () => {
    render(<TransactionHistoryList transactions={[buildTransaction({ memo: 'order-42' })]} />);
    expect(screen.getByText('order-42')).toBeTruthy();
  });
});
