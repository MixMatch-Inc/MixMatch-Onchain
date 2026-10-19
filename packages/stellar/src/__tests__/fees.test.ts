import { BASE_FEE, Keypair, TransactionBuilder, Account, Operation, Networks } from '@stellar/stellar-sdk';
import { describe, expect, it } from 'vitest';
import { buildFeeBump, DEFAULT_TRANSACTION_TIMEOUT_SECONDS, resolveFee } from '../fees.js';
import { stubClient } from './test-helpers.js';

describe('resolveFee', () => {
  it('returns the surge fee at the requested percentile', async () => {
    const client = stubClient({ horizon: { feeStats: () => Promise.resolve({ max_fee: { p70: '500', p90: '900' } }) } });
    expect(await resolveFee(client)).toBe('500');
    expect(await resolveFee(client, 'p90')).toBe('900');
  });

  it('never goes below the protocol base fee', async () => {
    const client = stubClient({ horizon: { feeStats: () => Promise.resolve({ max_fee: { p70: '10' } }) } });
    expect(await resolveFee(client)).toBe(BASE_FEE);
  });

  it('falls back to the base fee when fee stats are unavailable', async () => {
    const client = stubClient({ horizon: { feeStats: () => Promise.reject(new Error('down')) } });
    expect(await resolveFee(client)).toBe(BASE_FEE);
  });
});

describe('buildFeeBump', () => {
  it('wraps the inner transaction with the fee source', async () => {
    const source = Keypair.random();
    const feeSource = Keypair.random();
    const inner = new TransactionBuilder(new Account(source.publicKey(), '1'), {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(Operation.bumpSequence({ bumpTo: '10' }))
      .setTimeout(DEFAULT_TRANSACTION_TIMEOUT_SECONDS)
      .build();
    inner.sign(source);

    const client = stubClient({ horizon: { feeStats: () => Promise.resolve({ max_fee: { p70: '300' } }) } });
    const bumped = await buildFeeBump(client, inner, feeSource.publicKey());

    expect(bumped.feeSource).toBe(feeSource.publicKey());
    expect(bumped.innerTransaction.hash()).toEqual(inner.hash());
  });
});
