export interface EnvConfig {
  nodeEnv: string;
  port: number;
  databaseUrl: string;
  jwtSecret: string;
  /** Access token lifetime, in seconds. */
  jwtExpiresInSeconds: number;
  walletEncryptionKey: string;
  stellarNetwork: 'testnet' | 'public';
  stellarHorizonUrl?: string;
  stellarRpcUrl?: string;
  /** Deployed contract id of the escrow contract (see contracts/escrow); required to use /escrows endpoints. */
  stellarEscrowContractId?: string;
  /** How often the background job re-checks stuck PENDING transactions, in ms. */
  reconciliationIntervalMs: number;
  /** How long a PENDING transaction is left alone before a reconciliation attempt is made, in ms. */
  reconciliationStaleMs: number;
  /** How long reconciliation keeps retrying before giving up and flagging NEEDS_REVIEW, in ms. */
  reconciliationEscalationMs: number;
  /** Home domain of the SEP-24 anchor used for fiat deposit/withdraw (see modules/payments/anchor.service.ts). */
  anchorHomeDomain: string;
  /**
   * Secret key of the platform's admin co-signer, used to approve
   * high-value payments (see modules/payments/payments.service.ts and
   * `@mixmatch/stellar`'s multisig.ts). Left unset, the high-value gate is
   * disabled entirely — payments proceed regardless of amount, exactly as
   * before this feature existed. Set it to turn the gate on.
   */
  adminSigningSecret?: string;
  /** Native-XLM amount above which a payment requires admin co-signature; only enforced if `adminSigningSecret` is set. */
  highValueThresholdAmount: string;
  /**
   * Address of the HashiCorp Vault server whose transit secrets engine
   * holds Stellar account signing keys (see `@mixmatch/kms`'s
   * VaultTransitClient and modules/payments/wallet-resolver.ts). Set
   * together with `vaultToken` to move new-account signing off the
   * `walletEncryptionKey` symmetric-key model entirely — key material for
   * every new account then never exists outside Vault, not even
   * transiently in this process. Left unset, new accounts fall back to
   * the legacy encrypted-secret path (e.g. local dev without Vault
   * installed); existing accounts on that path keep working regardless.
   */
  vaultAddr?: string;
  /** Vault token authorized for the transit mount's create/read/sign paths. Required if `vaultAddr` is set. */
  vaultToken?: string;
  /** Vault transit mount path. Defaults to "transit". */
  vaultTransitMountPath?: string;
  /**
   * Name of the platform's admin co-signing key inside Vault, used in
   * place of `adminSigningSecret` once Vault is configured. Required if
   * `vaultAddr` is set and the high-value-payment gate is used.
   */
  adminSigningKeyName?: string;
}

const DEFAULT_PORT = 3000;
const DEFAULT_ANCHOR_HOME_DOMAIN = 'testanchor.stellar.org';
const DEFAULT_HIGH_VALUE_THRESHOLD_AMOUNT = '1000';
const DEFAULT_JWT_EXPIRES_IN_SECONDS = 60 * 60; // 1 hour
const MIN_JWT_SECRET_LENGTH = 32;
const DEFAULT_RECONCILIATION_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes
const DEFAULT_RECONCILIATION_STALE_MS = 2 * 60 * 1000; // 2 minutes
const DEFAULT_RECONCILIATION_ESCALATION_MS = 24 * 60 * 60 * 1000; // 24 hours
/** AES-256-GCM key: 32 bytes, hex-encoded (64 hex characters). */
const WALLET_ENCRYPTION_KEY_HEX_LENGTH = 64;

function required(env: NodeJS.ProcessEnv, key: string): string {
  const value = env[key]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

/** Validates and normalizes process.env into a typed `EnvConfig`. Throws on startup if misconfigured. */
export function validateEnv(env: NodeJS.ProcessEnv = process.env): EnvConfig {
  const nodeEnv = env.NODE_ENV?.trim() || 'development';
  const jwtSecret = required(env, 'JWT_SECRET');

  if (nodeEnv === 'production' && jwtSecret.length < MIN_JWT_SECRET_LENGTH) {
    throw new Error(
      `JWT_SECRET must be at least ${MIN_JWT_SECRET_LENGTH} characters in production`,
    );
  }

  const walletEncryptionKey = required(env, 'WALLET_ENCRYPTION_KEY');
  if (!/^[0-9a-f]{64}$/i.test(walletEncryptionKey)) {
    throw new Error(
      `WALLET_ENCRYPTION_KEY must be a ${WALLET_ENCRYPTION_KEY_HEX_LENGTH}-character hex string (32 bytes for AES-256)`,
    );
  }

  const stellarNetwork =
    env.STELLAR_NETWORK?.trim() === 'public' ? 'public' : 'testnet';

  const vaultAddr = env.VAULT_ADDR?.trim() || undefined;
  const vaultToken = env.VAULT_TOKEN?.trim() || undefined;
  if (vaultAddr && !vaultToken) {
    throw new Error('VAULT_TOKEN is required when VAULT_ADDR is set');
  }

  return {
    nodeEnv,
    port: Number(env.PORT) || DEFAULT_PORT,
    databaseUrl: required(env, 'DATABASE_URL'),
    jwtSecret,
    jwtExpiresInSeconds:
      Number(env.JWT_EXPIRES_IN_SECONDS) || DEFAULT_JWT_EXPIRES_IN_SECONDS,
    walletEncryptionKey,
    stellarNetwork,
    stellarHorizonUrl: env.STELLAR_HORIZON_URL?.trim(),
    stellarRpcUrl: env.STELLAR_RPC_URL?.trim(),
    stellarEscrowContractId: env.STELLAR_ESCROW_CONTRACT_ID?.trim(),
    reconciliationIntervalMs:
      Number(env.RECONCILIATION_INTERVAL_MS) ||
      DEFAULT_RECONCILIATION_INTERVAL_MS,
    reconciliationStaleMs:
      Number(env.RECONCILIATION_STALE_MS) || DEFAULT_RECONCILIATION_STALE_MS,
    reconciliationEscalationMs:
      Number(env.RECONCILIATION_ESCALATION_MS) ||
      DEFAULT_RECONCILIATION_ESCALATION_MS,
    anchorHomeDomain:
      env.ANCHOR_HOME_DOMAIN?.trim() || DEFAULT_ANCHOR_HOME_DOMAIN,
    adminSigningSecret: env.ADMIN_SIGNING_SECRET?.trim() || undefined,
    highValueThresholdAmount:
      env.HIGH_VALUE_THRESHOLD_AMOUNT?.trim() ||
      DEFAULT_HIGH_VALUE_THRESHOLD_AMOUNT,
    vaultAddr,
    vaultToken,
    vaultTransitMountPath: env.VAULT_TRANSIT_MOUNT_PATH?.trim() || undefined,
    adminSigningKeyName: env.ADMIN_SIGNING_KEY_NAME?.trim() || undefined,
  };
}
