import { Keypair, Networks, type Horizon, type rpc } from '@stellar/stellar-sdk';
import type { StellarClient } from '../interfaces/index.js';

/**
 * Builds a `StellarClient` for tests from partial fakes. Only the methods a
 * test exercises need to exist on `horizon` / `soroban`.
 */
export function stubClient(parts: { horizon?: object; soroban?: object; networkPassphrase?: string }): StellarClient {
  return {
    networkPassphrase: parts.networkPassphrase ?? Networks.TESTNET,
    horizon: (parts.horizon ?? {}) as Horizon.Server,
    soroban: (parts.soroban ?? {}) as rpc.Server,
    getNetwork: () => 'testnet',
  };
}

export function fakeClient(overrides: {
  loadAccount?: () => unknown;
  submitTransaction?: () => unknown;
}): StellarClient {
  const sourceKeypair = Keypair.random();
  return stubClient({
    horizon: {
      loadAccount:
        overrides.loadAccount ??
        (() => ({
          accountId: () => sourceKeypair.publicKey(),
          sequenceNumber: () => '1',
          incrementSequenceNumber: () => {},
        })),
      submitTransaction: overrides.submitTransaction ?? (() => Promise.resolve({ hash: 'fake-hash', ledger: 42 })),
    },
  });
}

export function fakeAccount(keypair: Keypair) {
  return Promise.resolve({
    accountId: () => keypair.publicKey(),
    sequenceNumber: () => '1',
    incrementSequenceNumber: () => {},
  });
}
