import {
  Account,
  BASE_FEE,
  Keypair,
  Networks,
  Operation,
  TransactionBuilder,
} from '@stellar/stellar-sdk';
import { randomBytes } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { authenticateSep10 } from '../sep10.js';
import { KeypairWallet } from '../../wallet.js';

const HOME_DOMAIN = 'testanchor.stellar.org';
const WEB_AUTH_ENDPOINT = `https://${HOME_DOMAIN}/auth`;

function buildChallenge(params: {
  serverKeypair: Keypair;
  clientPublicKey: string;
  sign?: boolean;
  sequence?: string;
}): string {
  const source = new Account(params.serverKeypair.publicKey(), params.sequence ?? '-1');
  const transaction = new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
    timebounds: { minTime: 0, maxTime: 0 },
  })
    .addOperation(
      Operation.manageData({
        source: params.clientPublicKey,
        name: `${HOME_DOMAIN} auth`,
        value: randomBytes(48).toString('base64').slice(0, 64),
      }),
    )
    .build();

  if (params.sign !== false) {
    transaction.sign(params.serverKeypair);
  }
  return transaction.toXDR();
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('authenticateSep10', () => {
  it('validates the challenge, signs it, and exchanges it for a JWT', async () => {
    const serverKeypair = Keypair.random();
    const wallet = KeypairWallet.fromSecret('testnet', Keypair.random().secret());
    const challengeXdr = buildChallenge({ serverKeypair, clientPublicKey: wallet.publicKey });

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ transaction: challengeXdr, network_passphrase: Networks.TESTNET }),
      })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ token: 'jwt-token' }) });
    vi.stubGlobal('fetch', fetchMock);

    const jwt = await authenticateSep10({
      webAuthEndpoint: WEB_AUTH_ENDPOINT,
      serverSigningKey: serverKeypair.publicKey(),
      homeDomain: HOME_DOMAIN,
      wallet,
      networkPassphrase: Networks.TESTNET,
    });

    expect(jwt).toBe('jwt-token');
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const challengeCallUrl = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(challengeCallUrl.searchParams.get('account')).toBe(wallet.publicKey);
    expect(challengeCallUrl.searchParams.get('home_domain')).toBe(HOME_DOMAIN);

    const tokenCall = fetchMock.mock.calls[1];
    expect(tokenCall?.[0]).toBe(WEB_AUTH_ENDPOINT);
    const tokenBody = JSON.parse(String((tokenCall?.[1] as RequestInit).body)) as { transaction: string };
    expect(typeof tokenBody.transaction).toBe('string');
  });

  it('rejects a challenge not signed by the anchor', async () => {
    const serverKeypair = Keypair.random();
    const wallet = KeypairWallet.fromSecret('testnet', Keypair.random().secret());
    const challengeXdr = buildChallenge({ serverKeypair, clientPublicKey: wallet.publicKey, sign: false });

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ transaction: challengeXdr, network_passphrase: Networks.TESTNET }),
      }),
    );

    await expect(
      authenticateSep10({
        webAuthEndpoint: WEB_AUTH_ENDPOINT,
        serverSigningKey: serverKeypair.publicKey(),
        homeDomain: HOME_DOMAIN,
        wallet,
        networkPassphrase: Networks.TESTNET,
      }),
    ).rejects.toThrow('not signed by the anchor');
  });

  it('rejects a challenge with a non-zero sequence number', async () => {
    const serverKeypair = Keypair.random();
    const wallet = KeypairWallet.fromSecret('testnet', Keypair.random().secret());
    const challengeXdr = buildChallenge({
      serverKeypair,
      clientPublicKey: wallet.publicKey,
      sequence: '5',
    });

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ transaction: challengeXdr, network_passphrase: Networks.TESTNET }),
      }),
    );

    await expect(
      authenticateSep10({
        webAuthEndpoint: WEB_AUTH_ENDPOINT,
        serverSigningKey: serverKeypair.publicKey(),
        homeDomain: HOME_DOMAIN,
        wallet,
        networkPassphrase: Networks.TESTNET,
      }),
    ).rejects.toThrow('non-zero sequence number');
  });

  it('throws when the challenge request fails', async () => {
    const wallet = KeypairWallet.fromSecret('testnet', Keypair.random().secret());
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }));

    await expect(
      authenticateSep10({
        webAuthEndpoint: WEB_AUTH_ENDPOINT,
        serverSigningKey: Keypair.random().publicKey(),
        homeDomain: HOME_DOMAIN,
        wallet,
        networkPassphrase: Networks.TESTNET,
      }),
    ).rejects.toThrow('HTTP 503');
  });

  it('throws when the token exchange fails', async () => {
    const serverKeypair = Keypair.random();
    const wallet = KeypairWallet.fromSecret('testnet', Keypair.random().secret());
    const challengeXdr = buildChallenge({ serverKeypair, clientPublicKey: wallet.publicKey });

    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ transaction: challengeXdr, network_passphrase: Networks.TESTNET }),
        })
        .mockResolvedValueOnce({ ok: false, status: 400 }),
    );

    await expect(
      authenticateSep10({
        webAuthEndpoint: WEB_AUTH_ENDPOINT,
        serverSigningKey: serverKeypair.publicKey(),
        homeDomain: HOME_DOMAIN,
        wallet,
        networkPassphrase: Networks.TESTNET,
      }),
    ).rejects.toThrow('HTTP 400');
  });
});
