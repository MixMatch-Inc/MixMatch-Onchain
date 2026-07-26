import { NotFoundError, type Horizon } from '@stellar/stellar-sdk';
import { describe, expect, it, vi } from 'vitest';
import { generateStellarAccount, loadStellarAccount, StellarAccountNotFoundError } from './account.js';

function fakeHorizon(loadAccount: (id: string) => Promise<unknown>): Horizon.Server {
  return { loadAccount } as unknown as Horizon.Server;
}

describe('generateStellarAccount', () => {
  it('generates a new account with a matching wallet public key', () => {
    const account = generateStellarAccount('testnet');

    expect(account.network).toBe('testnet');
    expect(account.publicKey).toBe(account.wallet.publicKey);
    expect(account.publicKey).toMatch(/^G[A-Z0-9]{55}$/);
  });
});

describe('loadStellarAccount', () => {
  it('returns sequence and balances for an existing account', async () => {
    const horizon = fakeHorizon(async () => ({
      sequenceNumber: () => '123',
      balances: [{ asset_type: 'native', balance: '100.0000000' }],
    }));

    const result = await loadStellarAccount(horizon, 'testnet', 'GABC');

    expect(result).toEqual({
      network: 'testnet',
      publicKey: 'GABC',
      sequence: '123',
      balances: [{ asset_type: 'native', balance: '100.0000000' }],
    });
  });

  it('throws StellarAccountNotFoundError when Horizon returns 404', async () => {
    const horizon = fakeHorizon(async () => {
      throw new NotFoundError('Not Found', {});
    });

    await expect(loadStellarAccount(horizon, 'testnet', 'GMISSING')).rejects.toThrow(
      StellarAccountNotFoundError,
    );
  });

  it('propagates unexpected errors unchanged', async () => {
    const horizon = fakeHorizon(async () => {
      throw new Error('network down');
    });

    await expect(loadStellarAccount(horizon, 'testnet', 'GABC')).rejects.toThrow('network down');
  });
});

describe('generateStellarAccount + loadStellarAccount (unfunded)', () => {
  it('reports a freshly generated, unfunded account as not found', async () => {
    const account = generateStellarAccount('testnet');
    const horizon = fakeHorizon(async () => {
      throw new NotFoundError('Not Found', {});
    });

    const fn = vi.fn();
    try {
      await loadStellarAccount(horizon, 'testnet', account.publicKey);
    } catch (error) {
      fn(error);
    }

    expect(fn).toHaveBeenCalledWith(expect.any(StellarAccountNotFoundError));
  });
});
