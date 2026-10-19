import { Keypair, StrKey } from '@stellar/stellar-sdk';
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

  it('treats an unrecognized network value as testnet', () => {
    const config = loadStellarConfig({ STELLAR_NETWORK: 'not-a-real-network' });
    expect(config.network).toBe('testnet');
  });

  it('leaves escrowContractId undefined when STELLAR_ESCROW_CONTRACT_ID is unset', () => {
    const config = loadStellarConfig({});
    expect(config.escrowContractId).toBeUndefined();
  });

  it('reads escrowContractId from STELLAR_ESCROW_CONTRACT_ID', () => {
    const contractId = StrKey.encodeContract(Keypair.random().rawPublicKey());
    const config = loadStellarConfig({ STELLAR_ESCROW_CONTRACT_ID: contractId });
    expect(config.escrowContractId).toBe(contractId);
  });

  it('rejects an escrow contract id that is not a C... strkey', () => {
    expect(() => loadStellarConfig({ STELLAR_ESCROW_CONTRACT_ID: 'CABCDEF' })).toThrow(/valid contract id/);
  });

  it('rejects endpoint URLs that are malformed or not http(s)', () => {
    expect(() => loadStellarConfig({ STELLAR_HORIZON_URL: 'not a url' })).toThrow(/STELLAR_HORIZON_URL/);
    expect(() => loadStellarConfig({ STELLAR_RPC_URL: 'ftp://rpc.example.com' })).toThrow(/http or https/);
  });

  it('supports futurenet and a local standalone network', () => {
    expect(loadStellarConfig({ STELLAR_NETWORK: 'futurenet' }).horizonUrl).toBe('https://horizon-futurenet.stellar.org');
    const standalone = loadStellarConfig({ STELLAR_NETWORK: 'standalone' });
    expect(standalone.network).toBe('standalone');
    expect(standalone.horizonUrl).toBe('http://localhost:8000');
    expect(standalone.rpcUrl).toBe('http://localhost:8000/rpc');
  });

  it('reads client options from the environment', () => {
    const config = loadStellarConfig({
      STELLAR_ALLOW_HTTP: 'true',
      STELLAR_TIMEOUT_MS: '5000',
      STELLAR_RETRIES: '1',
      STELLAR_APP_NAME: 'mixmatch-api',
      STELLAR_APP_VERSION: '1.2.3',
    });
    expect(config).toMatchObject({ allowHttp: true, timeoutMs: 5000, retries: 1, appName: 'mixmatch-api', appVersion: '1.2.3' });
    expect(() => loadStellarConfig({ STELLAR_TIMEOUT_MS: 'soon' })).toThrow(/STELLAR_TIMEOUT_MS/);
  });
});
