import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { PaymentForm } from '../components/PaymentForm';

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
    render(<PaymentForm onSubmit={jest.fn()} />);

    expect(screen.getByTestId('destinationPublicKey')).toBeTruthy();
    expect(screen.getByTestId('amount')).toBeTruthy();
    expect(screen.getByTestId('memo')).toBeTruthy();
    expect(screen.getByText('Send payment')).toBeTruthy();
  });

  it('shows a validation error for a malformed destination address', async () => {
    render(<PaymentForm onSubmit={jest.fn()} />);

    fireEvent.changeText(screen.getByTestId('destinationPublicKey'), 'not-a-real-key');
    fireEvent.changeText(screen.getByTestId('amount'), '10');
    fireEvent.press(screen.getByText('Send payment'));

    await waitFor(() => {
      expect(screen.getByText(/valid stellar public key/i)).toBeTruthy();
    });
  });

  it('calls onSubmit with the parsed values and onSuccess with the result', async () => {
    const onSubmit = jest.fn().mockResolvedValue(TRANSACTION);
    const onSuccess = jest.fn();

    render(<PaymentForm onSubmit={onSubmit} onSuccess={onSuccess} />);

    fireEvent.changeText(screen.getByTestId('destinationPublicKey'), VALID_PUBLIC_KEY);
    fireEvent.changeText(screen.getByTestId('amount'), '10');
    fireEvent.changeText(screen.getByTestId('memo'), 'invoice-1');
    fireEvent.press(screen.getByText('Send payment'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        destinationPublicKey: VALID_PUBLIC_KEY,
        amount: '10',
        memo: 'invoice-1',
      });
    });
    expect(onSuccess).toHaveBeenCalledWith(TRANSACTION);
  });

  it('prefills the recipient field when initialDestinationPublicKey is given', () => {
    render(<PaymentForm onSubmit={jest.fn()} initialDestinationPublicKey={VALID_PUBLIC_KEY} />);
    expect(screen.getByTestId('destinationPublicKey').props.value).toBe(VALID_PUBLIC_KEY);
  });

  it('shows a submission error when onSubmit rejects', async () => {
    const onSubmit = jest.fn().mockRejectedValue(new Error('Insufficient balance'));
    render(<PaymentForm onSubmit={onSubmit} />);

    fireEvent.changeText(screen.getByTestId('destinationPublicKey'), VALID_PUBLIC_KEY);
    fireEvent.changeText(screen.getByTestId('amount'), '10');
    fireEvent.press(screen.getByText('Send payment'));

    await waitFor(() => {
      expect(screen.getByText('Insufficient balance')).toBeTruthy();
    });
  });
});
