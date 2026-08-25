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
}

const DEFAULT_PORT = 3000;
const DEFAULT_ANCHOR_HOME_DOMAIN = 'testanchor.stellar.org';
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
  };
}
