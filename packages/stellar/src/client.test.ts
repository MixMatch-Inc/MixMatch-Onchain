import { Horizon, rpc } from '@stellar/stellar-sdk';
import { describe, expect, it } from 'vitest';
import { createStellarClient } from './client.js';
import type { StellarConfig } from './config.js';

const testConfig: StellarConfig = {
  network: 'testnet',
  networkPassphrase: 'Test SDF Network ; September 2015',
  horizonUrl: 'https://horizon-testnet.stellar.org',
  rpcUrl: 'https://soroban-testnet.stellar.org',
};

describe('createStellarClient', () => {
  it('builds a client configured for the given network', () => {
    const client = createStellarClient(testConfig);

    expect(client.getNetwork()).toBe('testnet');
    expect(client.config).toBe(testConfig);
  });

  it('constructs a Horizon server pointed at the configured URL', () => {
    const client = createStellarClient(testConfig);

    expect(client.horizon).toBeInstanceOf(Horizon.Server);
  });

  it('constructs a Soroban RPC server pointed at the configured URL', () => {
    const client = createStellarClient(testConfig);

    expect(client.soroban).toBeInstanceOf(rpc.Server);
  });

  it('falls back to env-derived config when none is provided', () => {
    const client = createStellarClient();

    expect(client.getNetwork()).toBe('testnet');
  });
});
