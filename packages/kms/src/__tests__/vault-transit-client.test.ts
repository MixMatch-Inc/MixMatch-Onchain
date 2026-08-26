import { afterEach, describe, expect, it, vi } from 'vitest';
import { VaultTransitClient, VaultTransitError } from '../vault-transit-client.js';

const config = { address: 'http://127.0.0.1:8200', token: 'test-token' };

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('VaultTransitClient.createSigningKey', () => {
  it('POSTs to /v1/transit/keys/:name with a non-exportable ed25519 key spec, authenticated via X-Vault-Token', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({ data: {} }) });
    vi.stubGlobal('fetch', fetchMock);

    await new VaultTransitClient(config).createSigningKey('account-1');

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://127.0.0.1:8200/v1/transit/keys/account-1');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>)['X-Vault-Token']).toBe('test-token');
    const body = JSON.parse(String(init.body)) as { type: string; exportable: boolean; allow_plaintext_backup: boolean };
    expect(body).toEqual({ type: 'ed25519', exportable: false, allow_plaintext_backup: false });
  });

  it('throws VaultTransitError when Vault rejects the request', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 400, text: () => Promise.resolve('{"errors":["bad request"]}') }),
    );

    await expect(new VaultTransitClient(config).createSigningKey('account-1')).rejects.toBeInstanceOf(
      VaultTransitError,
    );
  });
});

describe('VaultTransitClient.getPublicKey', () => {
  it('returns the raw public key bytes for the latest key version', async () => {
    const publicKeyBase64 = Buffer.from('a'.repeat(32)).toString('base64');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            data: { latest_version: 1, keys: { '1': { public_key: publicKeyBase64 } } },
          }),
      }),
    );

    const publicKey = await new VaultTransitClient(config).getPublicKey('account-1');

    expect(publicKey).toEqual(Buffer.from(publicKeyBase64, 'base64'));
  });

  it('uses the latest_version to select which key entry to read', async () => {
    const publicKeyBase64 = Buffer.from('b'.repeat(32)).toString('base64');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            data: {
              latest_version: 2,
              keys: {
                '1': { public_key: Buffer.from('old'.repeat(11)).toString('base64') },
                '2': { public_key: publicKeyBase64 },
              },
            },
          }),
      }),
    );

    const publicKey = await new VaultTransitClient(config).getPublicKey('account-1');

    expect(publicKey).toEqual(Buffer.from(publicKeyBase64, 'base64'));
  });

  it('throws VaultTransitError when the response has no public key', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: { latest_version: 1, keys: {} } }),
      }),
    );

    await expect(new VaultTransitClient(config).getPublicKey('account-1')).rejects.toBeInstanceOf(
      VaultTransitError,
    );
  });
});

describe('VaultTransitClient.sign', () => {
  it('sends base64-encoded input and extracts the signature from Vault\'s "vault:v1:<sig>" format', async () => {
    const rawSignature = Buffer.from('c'.repeat(64));
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: { signature: `vault:v1:${rawSignature.toString('base64')}` } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const data = Buffer.from('transaction-hash-bytes');
    const signature = await new VaultTransitClient(config).sign('account-1', data);

    expect(signature).toEqual(rawSignature);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://127.0.0.1:8200/v1/transit/sign/account-1');
    const body = JSON.parse(String(init.body)) as { input: string };
    expect(body.input).toBe(data.toString('base64'));
  });

  it('throws VaultTransitError on a network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));

    await expect(new VaultTransitClient(config).sign('account-1', Buffer.from('x'))).rejects.toThrow();
  });
});

describe('VaultTransitClient mount path', () => {
  it('honors a custom transit mount path', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({ data: {} }) });
    vi.stubGlobal('fetch', fetchMock);

    await new VaultTransitClient({ ...config, mountPath: 'custom-transit' }).createSigningKey('account-1');

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toBe('http://127.0.0.1:8200/v1/custom-transit/keys/account-1');
  });
});
