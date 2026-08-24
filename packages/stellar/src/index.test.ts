import { describe, expect, it } from 'vitest';
import { createStellarClient } from './client.js';

describe('@mixmatch/stellar', () => {
  it('creates a client for testnet by default', () => {
    const client = createStellarClient({
      network: 'testnet',
      horizonUrl: 'https://horizon-testnet.stellar.org',
      rpcUrl: 'https://soroban-testnet.stellar.org',
    });
    expect(client.getNetwork()).toBe('testnet');
  });
});
