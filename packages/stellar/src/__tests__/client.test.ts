import { Networks } from '@stellar/stellar-sdk';
import { describe, expect, it, vi } from 'vitest';
import { createStellarClient, StellarNetworkMismatchError } from '../client.js';

function clientFor(network: 'testnet' | 'public' | 'standalone', extra: object = {}) {
  return createStellarClient({
    network,
    horizonUrl: network === 'standalone' ? 'http://localhost:8000' : 'https://horizon-testnet.stellar.org',
    rpcUrl: network === 'standalone' ? 'http://localhost:8000/rpc' : 'https://soroban-testnet.stellar.org',
    retries: 0,
    ...extra,
  });
}

describe('DefaultStellarClient', () => {
  it('derives the passphrase from the network, or from an override', () => {
    expect(clientFor('testnet').networkPassphrase).toBe(Networks.TESTNET);
    expect(clientFor('standalone').networkPassphrase).toBe('Standalone Network ; February 2017');
    expect(clientFor('testnet', { networkPassphrase: 'Custom ; 1' }).networkPassphrase).toBe('Custom ; 1');
  });

  it('accepts http endpoints for a standalone network', () => {
    expect(() => clientFor('standalone')).not.toThrow();
  });

  describe('verifyNetwork', () => {
    it('passes when both endpoints serve the configured network', async () => {
      const client = clientFor('testnet');
      vi.spyOn(client.horizon, 'root').mockResolvedValue({ network_passphrase: Networks.TESTNET } as never);
      vi.spyOn(client.soroban, 'getNetwork').mockResolvedValue({ passphrase: Networks.TESTNET } as never);
      await expect(client.verifyNetwork()).resolves.toBeUndefined();
    });

    it('fails fast when Horizon serves another network', async () => {
      const client = clientFor('public');
      vi.spyOn(client.horizon, 'root').mockResolvedValue({ network_passphrase: Networks.TESTNET } as never);
      await expect(client.verifyNetwork()).rejects.toBeInstanceOf(StellarNetworkMismatchError);
    });

    it('fails fast when the RPC serves another network', async () => {
      const client = clientFor('testnet');
      vi.spyOn(client.horizon, 'root').mockResolvedValue({ network_passphrase: Networks.TESTNET } as never);
      vi.spyOn(client.soroban, 'getNetwork').mockResolvedValue({ passphrase: Networks.PUBLIC } as never);
      await expect(client.verifyNetwork()).rejects.toThrow(/rpc endpoint serves network/);
    });

    it('retries an unreachable endpoint before giving up', async () => {
      const client = clientFor('testnet', { retries: 1 });
      const root = vi
        .spyOn(client.horizon, 'root')
        .mockRejectedValueOnce(new Error('ECONNRESET'))
        .mockResolvedValue({ network_passphrase: Networks.TESTNET } as never);
      vi.spyOn(client.soroban, 'getNetwork').mockResolvedValue({ passphrase: Networks.TESTNET } as never);
      await expect(client.verifyNetwork()).resolves.toBeUndefined();
      expect(root).toHaveBeenCalledTimes(2);
    });
  });
});
