import { Account, Networks } from '@stellar/stellar-sdk';
import type { DefaultStellarClient } from '@mixmatch/stellar';

export interface FakeHorizonOverrides {
  loadAccount?: (id: string) => Promise<unknown>;
  submitTransaction?: (tx: unknown) => Promise<unknown>;
  friendbotCall?: () => Promise<unknown>;
  paymentRecords?: unknown[];
}

/**
 * Builds a fake `DefaultStellarClient` whose `horizon` methods are
 * vi.fn-free plain functions (so this file has no test-framework
 * dependency) — callers pass `vi.fn()`-wrapped overrides when they need to
 * assert on calls.
 */
export function fakeStellarClient(overrides: FakeHorizonOverrides = {}): DefaultStellarClient {
  const loadAccount = overrides.loadAccount ?? (async (id: string) => new Account(id, '100'));
  const submitTransaction =
    overrides.submitTransaction ?? (async () => ({ hash: 'fake-hash', ledger: 1, successful: true }));
  const friendbotCall = overrides.friendbotCall ?? (async () => ({ hash: 'friendbot-hash' }));
  const paymentRecords = overrides.paymentRecords ?? [];

  const horizon = {
    loadAccount,
    submitTransaction,
    friendbot: () => ({ call: friendbotCall }),
    payments: () => {
      const builder = {
        forAccount: () => builder,
        order: () => builder,
        limit: () => builder,
        call: async () => ({ records: paymentRecords }),
      };
      return builder;
    },
  };

  return {
    config: {
      network: 'testnet',
      networkPassphrase: Networks.TESTNET,
      horizonUrl: 'https://horizon-testnet.stellar.org',
      rpcUrl: 'https://soroban-testnet.stellar.org',
    },
    horizon,
    getNetwork: () => 'testnet',
  } as unknown as DefaultStellarClient;
}
