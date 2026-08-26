/**
 * Thin client for HashiCorp Vault's transit secrets engine, used as the
 * KMS backend for Stellar account signing keys (see
 * `apps/api/src/modules/payments/README.md`'s "Wallet custody" section
 * for the full rationale). Every key is created with `exportable: false`
 * and `allow_plaintext_backup: false` — Vault signs on request but never
 * hands back key material, so no caller (including this client) ever
 * holds a raw secret key.
 */
export interface VaultTransitConfig {
  /** e.g. "http://127.0.0.1:8200" for a local dev server. */
  address: string;
  /** A Vault token authorized for the transit mount's create/read/sign paths. */
  token: string;
  /** Transit secrets engine mount path. Defaults to "transit". */
  mountPath?: string;
}

export class VaultTransitError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'VaultTransitError';
  }
}

interface VaultKeyReadResponse {
  data: {
    keys: Record<string, { public_key: string }>;
    latest_version: number;
  };
}

interface VaultSignResponse {
  data: {
    signature: string;
  };
}

export class VaultTransitClient {
  private readonly baseUrl: string;
  private readonly token: string;

  constructor(config: VaultTransitConfig) {
    this.baseUrl = `${config.address.replace(/\/$/, '')}/v1/${config.mountPath ?? 'transit'}`;
    this.token = config.token;
  }

  /**
   * Creates a new non-exportable ed25519 signing key inside Vault. Idempotent
   * in the sense that Vault errors if the name is already taken — callers
   * should pick a name that's unique per account (e.g. the account's own id).
   */
  async createSigningKey(keyName: string): Promise<void> {
    await this.request(`/keys/${encodeURIComponent(keyName)}`, {
      method: 'POST',
      body: JSON.stringify({
        type: 'ed25519',
        exportable: false,
        allow_plaintext_backup: false,
      }),
    });
  }

  /** Returns the raw 32-byte ed25519 public key for a signing key's latest version. */
  async getPublicKey(keyName: string): Promise<Buffer> {
    const response = await this.request<VaultKeyReadResponse>(`/keys/${encodeURIComponent(keyName)}`, {
      method: 'GET',
    });
    const latestVersion = String(response.data.latest_version);
    const publicKeyBase64 = response.data.keys[latestVersion]?.public_key;
    if (!publicKeyBase64) {
      throw new VaultTransitError(`No public key found for signing key "${keyName}"`);
    }
    return Buffer.from(publicKeyBase64, 'base64');
  }

  /** Signs `data` with the named key, returning the raw 64-byte ed25519 signature. Vault never returns key material — only this signature. */
  async sign(keyName: string, data: Buffer): Promise<Buffer> {
    const response = await this.request<VaultSignResponse>(`/sign/${encodeURIComponent(keyName)}`, {
      method: 'POST',
      body: JSON.stringify({ input: data.toString('base64') }),
    });
    // Vault's own signature format is "vault:v<version>:<base64>".
    const parts = response.data.signature.split(':');
    const signatureBase64 = parts[parts.length - 1];
    if (!signatureBase64) {
      throw new VaultTransitError(`Malformed signature response for key "${keyName}"`);
    }
    return Buffer.from(signatureBase64, 'base64');
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: { 'X-Vault-Token': this.token, 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new VaultTransitError(`Vault request to ${path} failed: HTTP ${response.status} ${body}`.trim(), response.status);
    }

    if (response.status === 204) {
      return undefined as T;
    }
    return (await response.json()) as T;
  }
}
