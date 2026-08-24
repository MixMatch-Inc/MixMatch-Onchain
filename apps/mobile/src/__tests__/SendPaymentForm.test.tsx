import type { TransactionRecord } from '@mixmatch/shared';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import SendPaymentForm from '../components/SendPaymentForm';

const VALID_ADDRESS = 'G'.padEnd(56, 'A');

function buildTransaction(overrides: Partial<TransactionRecord> = {}): TransactionRecord {
  return {
    id: 'tx-1',
    idempotencyKey: 'key-1',
    stellarAccountId: 'acct-1',
    destinationPublicKey: VALID_ADDRESS,
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

describe('SendPaymentForm', () => {
  it('rejects submission with an invalid destination address', async () => {
    const onSubmit = jest.fn();
    render(<SendPaymentForm onSubmit={onSubmit} />);

    fireEvent.changeText(screen.getByTestId('destination-input'), 'not-an-address');
    fireEvent.changeText(screen.getByTestId('amount-input'), '10');
    fireEvent.press(screen.getByTestId('send-button'));

    await waitFor(() => expect(screen.getByText(/56 characters/i)).toBeTruthy());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('rejects a zero amount', async () => {
    const onSubmit = jest.fn();
    render(<SendPaymentForm onSubmit={onSubmit} />);

    fireEvent.changeText(screen.getByTestId('destination-input'), VALID_ADDRESS);
    fireEvent.changeText(screen.getByTestId('amount-input'), '0');
    fireEvent.press(screen.getByTestId('send-button'));

    await waitFor(() => expect(screen.getByText(/greater than zero/i)).toBeTruthy());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits valid input and clears the form on success', async () => {
    const transaction = buildTransaction();
    const onSubmit = jest.fn().mockResolvedValue(transaction);
    const onSuccess = jest.fn();
    render(<SendPaymentForm onSubmit={onSubmit} onSuccess={onSuccess} />);

    fireEvent.changeText(screen.getByTestId('destination-input'), VALID_ADDRESS);
    fireEvent.changeText(screen.getByTestId('amount-input'), '10');
    fireEvent.press(screen.getByTestId('send-button'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ destinationPublicKey: VALID_ADDRESS, amount: '10' }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(transaction));
  });

  it('shows an error message when submission fails', async () => {
    const onSubmit = jest.fn().mockRejectedValue(new Error('insufficient balance'));
    render(<SendPaymentForm onSubmit={onSubmit} />);

    fireEvent.changeText(screen.getByTestId('destination-input'), VALID_ADDRESS);
    fireEvent.changeText(screen.getByTestId('amount-input'), '10');
    fireEvent.press(screen.getByTestId('send-button'));

    await waitFor(() => expect(screen.getByText('insufficient balance')).toBeTruthy());
  });

  it('prefills the destination from a scanned QR code', () => {
    render(<SendPaymentForm onSubmit={jest.fn()} initialDestination={VALID_ADDRESS} />);

    expect(screen.getByTestId('destination-input').props.value).toBe(VALID_ADDRESS);
  });
});
