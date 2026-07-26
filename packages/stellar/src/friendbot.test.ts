import type { Horizon } from '@stellar/stellar-sdk';
import { describe, expect, it, vi } from 'vitest';
import { fundTestnetAccount, FriendbotFundingError } from './friendbot.js';

function fakeHorizon(call: () => Promise<unknown>): Horizon.Server {
  return { friendbot: vi.fn(() => ({ call })) } as unknown as Horizon.Server;
}

describe('fundTestnetAccount', () => {
  it('calls Horizon friendbot for the given public key on testnet', async () => {
    const call = vi.fn().mockResolvedValue({ hash: 'tx-hash' });
    const horizon = fakeHorizon(call);

    await fundTestnetAccount(horizon, 'testnet', 'GABC');

    expect(horizon.friendbot).toHaveBeenCalledWith('GABC');
    expect(call).toHaveBeenCalled();
  });

  it('rejects funding requests on the public network', async () => {
    const horizon = fakeHorizon(vi.fn());

    await expect(fundTestnetAccount(horizon, 'public', 'GABC')).rejects.toThrow(
      FriendbotFundingError,
    );
    expect(horizon.friendbot).not.toHaveBeenCalled();
  });

  it('wraps a Friendbot failure in FriendbotFundingError', async () => {
    const call = vi.fn().mockRejectedValue(new Error('already funded'));
    const horizon = fakeHorizon(call);

    await expect(fundTestnetAccount(horizon, 'testnet', 'GABC')).rejects.toThrow(
      /Friendbot funding failed for GABC/,
    );
  });
});
