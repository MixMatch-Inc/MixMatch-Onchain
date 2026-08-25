import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchStellarToml } from '../sep1.js';

const SAMPLE_TOML = `
SIGNING_KEY="GCHLHDBOKG2JWMJQBTLSL5XG6NO7ESXI2TAQKZXCXWXB5WI2X6W233PR"
WEB_AUTH_ENDPOINT="https://testanchor.stellar.org/auth"
TRANSFER_SERVER_SEP0024="https://testanchor.stellar.org/sep24"

[[CURRENCIES]]
code="SRT"
issuer="GCDNJUBQSX7AJWLJACMJ7I4BC3Z47BQUTMHEICZLE6MU4KQBRYG5JY6B"

[[CURRENCIES]]
code="native"
`;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchStellarToml', () => {
  it('fetches and parses an anchor stellar.toml', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve(SAMPLE_TOML) });
    vi.stubGlobal('fetch', fetchMock);

    const toml = await fetchStellarToml('testanchor.stellar.org');

    expect(fetchMock).toHaveBeenCalledWith('https://testanchor.stellar.org/.well-known/stellar.toml');
    expect(toml).toEqual({
      signingKey: 'GCHLHDBOKG2JWMJQBTLSL5XG6NO7ESXI2TAQKZXCXWXB5WI2X6W233PR',
      webAuthEndpoint: 'https://testanchor.stellar.org/auth',
      transferServerSep24: 'https://testanchor.stellar.org/sep24',
      currencies: [
        { code: 'SRT', issuer: 'GCDNJUBQSX7AJWLJACMJ7I4BC3Z47BQUTMHEICZLE6MU4KQBRYG5JY6B' },
        { code: 'native', issuer: undefined },
      ],
    });
  });

  it('throws when the request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }));

    await expect(fetchStellarToml('no-anchor.example.com')).rejects.toThrow('HTTP 404');
  });

  it('returns an empty currencies list when CURRENCIES is absent', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve('SIGNING_KEY="GABC"') }),
    );

    const toml = await fetchStellarToml('minimal.example.com');
    expect(toml.currencies).toEqual([]);
  });
});
