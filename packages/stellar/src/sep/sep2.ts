/**
 * SEP-2 federation support (#1388). Resolves `name*mixmatch.app` addresses to
 * Stellar account IDs via the federation server advertised in stellar.toml.
 */

const FEDERATION_NAME = 'name';
const FEDERATION_DOMAIN = 'mixmatch.app';

export interface FederationResolveResult {
  stellarAccountId: string;
  /** Stellar muxed account id, when returned by the server. */
  stellarAccountIdMuxed?: string;
  memo?: string;
  memoType?: string;
}

interface RawFederationResponse {
  stellar_account_id?: unknown;
  stellar_account_id_muxed?: unknown;
  memo?: unknown;
  memo_type?: unknown;
  detail?: unknown;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

/** The federation address we publish for a MixMatch handle. */
export function handleToFederationAddress(handle: string): string {
  return `${handle.replace(/^@/, '')}*${FEDERATION_DOMAIN}`;
}

export function isMixMatchFederationAddress(address: string): boolean {
  return /^[^@*]+\*mixmatch\.app$/i.test(address);
}

/**
 * Resolves a federation address. `federationServer` is the FEDERATION_SERVER
 * value from the home domain's stellar.toml (see `fetchStellarToml`).
 */
export async function resolveFederationAddress(
  address: string,
  federationServer: string,
): Promise<FederationResolveResult> {
  const normalized = address.includes('*') ? address : handleToFederationAddress(address);
  const url = new URL(federationServer.replace(/\/$/, '') + '/lookup');
  url.searchParams.set('q', normalized);
  url.searchParams.set('type', FEDERATION_NAME);

  const response = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
  });
  const body = (await response.json().catch(() => ({}))) as RawFederationResponse;
  if (!response.ok) {
    throw new Error(asString(body.detail) ?? `Federation lookup failed for ${normalized}: HTTP ${response.status}`);
  }

  const stellarAccountId = asString(body.stellar_account_id);
  if (!stellarAccountId) {
    throw new Error(`Federation lookup returned no account for ${normalized}`);
  }

  return {
    stellarAccountId,
    stellarAccountIdMuxed: asString(body.stellar_account_id_muxed),
    memo: asString(body.memo),
    memoType: asString(body.memo_type),
  };
}
