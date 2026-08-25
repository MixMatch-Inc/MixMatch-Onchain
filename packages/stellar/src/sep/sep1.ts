import * as toml from 'toml';

/** The subset of stellar.toml fields needed to drive SEP-10 auth and SEP-24 deposit/withdraw against an anchor. */
export interface StellarTomlInfo {
  signingKey?: string;
  webAuthEndpoint?: string;
  transferServerSep24?: string;
  currencies: Array<{ code: string; issuer?: string }>;
}

interface RawStellarToml {
  SIGNING_KEY?: unknown;
  WEB_AUTH_ENDPOINT?: unknown;
  TRANSFER_SERVER_SEP0024?: unknown;
  CURRENCIES?: unknown;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function parseCurrencies(raw: unknown): Array<{ code: string; issuer?: string }> {
  if (!Array.isArray(raw)) {
    return [];
  }
  const currencies: Array<{ code: string; issuer?: string }> = [];
  for (const entry of raw) {
    if (typeof entry !== 'object' || entry === null) {
      continue;
    }
    const code = asString((entry as Record<string, unknown>).code);
    if (code) {
      currencies.push({ code, issuer: asString((entry as Record<string, unknown>).issuer) });
    }
  }
  return currencies;
}

/** Fetches and parses `https://{homeDomain}/.well-known/stellar.toml` for an anchor's SEP-1 metadata. */
export async function fetchStellarToml(homeDomain: string): Promise<StellarTomlInfo> {
  const url = `https://${homeDomain}/.well-known/stellar.toml`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch stellar.toml from ${url}: HTTP ${response.status}`);
  }

  const text = await response.text();
  const raw = toml.parse(text) as RawStellarToml;

  return {
    signingKey: asString(raw.SIGNING_KEY),
    webAuthEndpoint: asString(raw.WEB_AUTH_ENDPOINT),
    transferServerSep24: asString(raw.TRANSFER_SERVER_SEP0024),
    currencies: parseCurrencies(raw.CURRENCIES),
  };
}
