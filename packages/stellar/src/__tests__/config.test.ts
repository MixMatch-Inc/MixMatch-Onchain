import { describe, expect, it } from 'vitest';
import { loadStellarConfig } from '../config.js';

describe('loadStellarConfig', () => {
  it('defaults to testnet when STELLAR_NETWORK is unset', () => {
    const config = loadStellarConfig({});
    expect(config.network).toBe('testnet');
    expect(config.horizonUrl).toBe('https://horizon-testnet.stellar.org');
  });

  it('uses public network defaults when STELLAR_NETWORK=public', () => {
    const config = loadStellarConfig({ STELLAR_NETWORK: 'public' });
    expect(config.network).toBe('public');
    expect(config.horizonUrl).toBe('https://horizon.stellar.org');
  });

  it('honors explicit STELLAR_HORIZON_URL / STELLAR_RPC_URL overrides', () => {
    const config = loadStellarConfig({
      STELLAR_NETWORK: 'testnet',
      STELLAR_HORIZON_URL: 'https://custom-horizon.example.com',
      STELLAR_RPC_URL: 'https://custom-rpc.example.com',
    });
    expect(config.horizonUrl).toBe('https://custom-horizon.example.com');
    expect(config.rpcUrl).toBe('https://custom-rpc.example.com');
  });

  it('throws on an unrecognized network value, listing the valid ones', () => {
    expect(() => loadStellarConfig({ STELLAR_NETWORK: 'not-a-real-network' })).toThrow(
      'Unknown STELLAR_NETWORK "not-a-real-network". Valid values: testnet, public.',
    );
  });

  it('throws on "mainnet" rather than silently using testnet', () => {
    expect(() => loadStellarConfig({ STELLAR_NETWORK: 'mainnet' })).toThrow(/Valid values/);
  });

  it('treats an empty STELLAR_NETWORK as unset', () => {
    expect(loadStellarConfig({ STELLAR_NETWORK: '  ' }).network).toBe('testnet');
  });

  it('leaves escrowContractId undefined when STELLAR_ESCROW_CONTRACT_ID is unset', () => {
    const config = loadStellarConfig({});
    expect(config.escrowContractId).toBeUndefined();
  });

  it('reads escrowContractId from STELLAR_ESCROW_CONTRACT_ID', () => {
    const config = loadStellarConfig({ STELLAR_ESCROW_CONTRACT_ID: 'CABCDEF' });
    expect(config.escrowContractId).toBe('CABCDEF');
  });
});
