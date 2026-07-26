import { Networks } from '@stellar/stellar-sdk';
import { describe, expect, it } from 'vitest';
import { loadStellarConfig } from './config.js';

describe('loadStellarConfig', () => {
  it('defaults to testnet when STELLAR_NETWORK is unset', () => {
    const config = loadStellarConfig({});

    expect(config.network).toBe('testnet');
    expect(config.networkPassphrase).toBe(Networks.TESTNET);
    expect(config.horizonUrl).toBe('https://horizon-testnet.stellar.org');
    expect(config.rpcUrl).toBe('https://soroban-testnet.stellar.org');
  });

  it('resolves public network defaults', () => {
    const config = loadStellarConfig({ STELLAR_NETWORK: 'public' });

    expect(config.network).toBe('public');
    expect(config.networkPassphrase).toBe(Networks.PUBLIC);
    expect(config.horizonUrl).toBe('https://horizon.stellar.org');
  });

  it('allows overriding HORIZON_URL and RPC_URL', () => {
    const config = loadStellarConfig({
      STELLAR_NETWORK: 'testnet',
      HORIZON_URL: 'https://custom-horizon.example.com',
      RPC_URL: 'https://custom-rpc.example.com',
    });

    expect(config.horizonUrl).toBe('https://custom-horizon.example.com');
    expect(config.rpcUrl).toBe('https://custom-rpc.example.com');
  });

  it('throws on an invalid STELLAR_NETWORK value', () => {
    expect(() => loadStellarConfig({ STELLAR_NETWORK: 'devnet' })).toThrow(
      /Invalid STELLAR_NETWORK/,
    );
  });
});
