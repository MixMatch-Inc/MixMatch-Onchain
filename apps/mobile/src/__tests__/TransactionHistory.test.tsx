import { fireEvent, render, screen } from '@testing-library/react-native';
import { TransactionHistory } from '../components/TransactionHistory';

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
    render(
      <TransactionHistory transactions={[]} total={0} page={1} limit={10} onPageChange={jest.fn()} onSelect={jest.fn()} />,
    );
    expect(screen.getByText(/no transactions yet/i)).toBeTruthy();
  });

  it('renders a row per transaction and calls onSelect when viewed', () => {
    const onSelect = jest.fn();
    render(
      <TransactionHistory
        transactions={[TRANSACTION]}
        total={1}
        page={1}
        limit={10}
        onPageChange={jest.fn()}
        onSelect={onSelect}
      />,
    );

    expect(screen.getByText(TRANSACTION.destinationPublicKey)).toBeTruthy();
    expect(screen.getByText('10 XLM')).toBeTruthy();

    fireEvent.press(screen.getByText('View'));
    expect(onSelect).toHaveBeenCalledWith(TRANSACTION);
  });

  it('hides pagination controls when everything fits on one page', () => {
    render(
      <TransactionHistory
        transactions={[TRANSACTION]}
        total={1}
        page={1}
        limit={10}
        onPageChange={jest.fn()}
        onSelect={jest.fn()}
      />,
    );
    expect(screen.queryByText(/page 1 of/i)).toBeNull();
  });

  it('shows pagination and calls onPageChange with the target page', () => {
    const onPageChange = jest.fn();
    render(
      <TransactionHistory
        transactions={[TRANSACTION]}
        total={25}
        page={2}
        limit={10}
        onPageChange={onPageChange}
        onSelect={jest.fn()}
      />,
    );

    expect(screen.getByText('Page 2 of 3')).toBeTruthy();
    fireEvent.press(screen.getByText('Next'));
    expect(onPageChange).toHaveBeenCalledWith(3);
    fireEvent.press(screen.getByText('Previous'));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });
});
