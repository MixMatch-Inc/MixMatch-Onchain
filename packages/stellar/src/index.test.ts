import { describe, expect, it } from 'vitest';
import type { StellarAccountRef, StellarClient } from './index.js';

describe('@mixmatch/stellar scaffold', () => {
  it('exposes placeholder types that satisfy the StellarClient shape', () => {
    const account: StellarAccountRef = {
      network: 'testnet',
      publicKey: 'GPLACEHOLDER',
    };

    const client: StellarClient = {
      getNetwork: () => account.network,
    };

    expect(client.getNetwork()).toBe('testnet');
  });
});
