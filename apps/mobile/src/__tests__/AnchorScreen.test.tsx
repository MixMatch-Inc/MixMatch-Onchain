import type { AnchorTransactionRecord } from '@mixmatch/shared';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import AnchorScreen from '../components/AnchorScreen';
import * as anchorClient from '../services/anchor-client';

jest.mock('../services/anchor-client');
const client = anchorClient as jest.Mocked<typeof anchorClient>;

function tx(overrides: Partial<AnchorTransactionRecord> = {}): AnchorTransactionRecord {
  return {
    id: 'a1',
    stellarAccountId: 's1',
    kind: 'deposit',
    assetCode: 'SRT',
    homeDomain: 'anchor.example',
    sep24TransactionId: 'sep-1',
    status: 'incomplete',
    interactiveUrl: 'https://anchor.example/interactive',
    moreInfoUrl: null,
    amountIn: null,
    amountOut: null,
    stellarTransactionId: null,
    externalTransactionId: null,
    message: null,
    startedAt: '2025-01-01T00:00:00.000Z',
    completedAt: null,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('AnchorScreen (#1401)', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    client.getAnchorHistory.mockResolvedValue({ transactions: [], total: 0, page: 1, limit: 20 });
  });

  it('starts a deposit, opens the anchor in the in-app browser and refreshes the status', async () => {
    const openBrowser = jest.fn().mockResolvedValue({ type: 'dismiss' });
    client.depositAnchor.mockResolvedValue({ transaction: tx(), interactiveUrl: 'https://anchor.example/interactive' });
    client.getAnchorStatus.mockResolvedValue({ transaction: tx({ status: 'completed', interactiveUrl: null }) });

    render(<AnchorScreen accessToken="token" openBrowser={openBrowser} />);
    fireEvent.press(await screen.findByText('Start deposit'));

    await waitFor(() => expect(openBrowser).toHaveBeenCalledWith('https://anchor.example/interactive'));
    await waitFor(() => expect(client.getAnchorStatus).toHaveBeenCalledWith('a1', 'token'));
    expect(await screen.findByText('Completed')).toBeTruthy();
  });

  it('starts a withdrawal', async () => {
    const openBrowser = jest.fn().mockResolvedValue(undefined);
    client.withdrawAnchor.mockResolvedValue({ transaction: tx({ kind: 'withdrawal' }), interactiveUrl: 'https://anchor.example/w' });
    client.getAnchorStatus.mockResolvedValue({ transaction: tx({ kind: 'withdrawal', status: 'pending_anchor' }) });

    render(<AnchorScreen accessToken="token" openBrowser={openBrowser} />);
    fireEvent.press(await screen.findByText('Withdraw'));
    fireEvent.press(screen.getByText('Start withdrawal'));

    await waitFor(() => expect(client.withdrawAnchor).toHaveBeenCalled());
    await waitFor(() => expect(openBrowser).toHaveBeenCalledWith('https://anchor.example/w'));
  });

  it('shows a validation error for a bad asset code', async () => {
    render(<AnchorScreen accessToken="token" openBrowser={jest.fn()} />);
    fireEvent.changeText(await screen.findByLabelText('Asset code'), '');
    fireEvent.press(screen.getByText('Start deposit'));
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(client.depositAnchor).not.toHaveBeenCalled();
  });

  it('offers to continue an incomplete transaction', async () => {
    const openBrowser = jest.fn().mockResolvedValue(undefined);
    client.getAnchorHistory.mockResolvedValue({ transactions: [tx()], total: 1, page: 1, limit: 20 });
    client.getAnchorStatus.mockResolvedValue({ transaction: tx() });

    render(<AnchorScreen accessToken="token" openBrowser={openBrowser} />);
    fireEvent.press(await screen.findByText('Continue on the anchor'));
    await waitFor(() => expect(openBrowser).toHaveBeenCalledWith('https://anchor.example/interactive'));
  });
});
