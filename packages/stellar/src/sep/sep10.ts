import { Keypair, Transaction } from '@stellar/stellar-sdk';
import type { Wallet } from '../wallet.js';

export interface Sep10AuthParams {
  /** The anchor's `WEB_AUTH_ENDPOINT`, from its stellar.toml. */
  webAuthEndpoint: string;
  /** The anchor's `SIGNING_KEY`, from its stellar.toml — used to verify the challenge is genuinely theirs. */
  serverSigningKey: string;
  /** The anchor's home domain (e.g. "testanchor.stellar.org"). */
  homeDomain: string;
  /** The account authenticating — its keypair signs the challenge. */
  wallet: Wallet;
  networkPassphrase: string;
}

interface ChallengeResponse {
  transaction: string;
  network_passphrase?: string;
}

interface TokenResponse {
  token: string;
}

/**
 * Runs the SEP-10 web authentication flow end-to-end: fetches the anchor's
 * challenge transaction, validates it was actually issued by the anchor
 * (server signature present, sequence number zero — both required by the
 * spec so the challenge can never itself be submitted as a real
 * transaction), signs it with the caller's wallet, and exchanges it for a
 * JWT. Returns the JWT, used to authenticate subsequent SEP-24 calls.
 */
export async function authenticateSep10(params: Sep10AuthParams): Promise<string> {
  const challengeUrl = new URL(params.webAuthEndpoint);
  challengeUrl.searchParams.set('account', params.wallet.publicKey);
  challengeUrl.searchParams.set('home_domain', params.homeDomain);

  const challengeResponse = await fetch(challengeUrl.toString());
  if (!challengeResponse.ok) {
    throw new Error(`SEP-10 challenge request failed: HTTP ${challengeResponse.status}`);
  }
  const challengeBody = (await challengeResponse.json()) as ChallengeResponse;

  const networkPassphrase = challengeBody.network_passphrase ?? params.networkPassphrase;
  const transaction = new Transaction(challengeBody.transaction, networkPassphrase);

  if (transaction.sequence !== '0') {
    throw new Error('SEP-10 challenge transaction has a non-zero sequence number');
  }

  const serverKeypair = Keypair.fromPublicKey(params.serverSigningKey);
  const challengeHash = transaction.hash();
  const signedByServer = transaction.signatures.some((decoratedSignature) =>
    serverKeypair.verify(challengeHash, decoratedSignature.signature()),
  );
  if (!signedByServer) {
    throw new Error("SEP-10 challenge transaction is not signed by the anchor's signing key");
  }

  await params.wallet.sign(transaction);

  const tokenResponse = await fetch(params.webAuthEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transaction: transaction.toXDR() }),
  });
  if (!tokenResponse.ok) {
    throw new Error(`SEP-10 token exchange failed: HTTP ${tokenResponse.status}`);
  }
  const tokenBody = (await tokenResponse.json()) as TokenResponse;
  return tokenBody.token;
}
