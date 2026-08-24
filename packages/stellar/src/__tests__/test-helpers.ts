import { Keypair, Networks } from '@stellar/stellar-sdk';
import type { DefaultStellarClient } from '../client.js';

export function fakeClient(overrides: {
  loadAccount?: () => unknown;
  submitTransaction?: () => unknown;
}): DefaultStellarClient {
  const sourceKeypair = Keypair.random();
  return {
    networkPassphrase: Networks.TESTNET,
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
  } as unknown as DefaultStellarClient;
}

export function fakeAccount(keypair: Keypair) {
  return Promise.resolve({
    accountId: () => keypair.publicKey(),
    sequenceNumber: () => '1',
    incrementSequenceNumber: () => {},
  });
}
