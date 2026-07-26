import 'dotenv/config';

export interface AppConfig {
  nodeEnv: string;
  port: number;
  databaseUrl: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  webOrigin: string;
  stellarNetwork: 'testnet' | 'public';
  rpcUrl: string;
}

function requireEnv(name: string, fallback?: string): string {
  const raw = process.env[name];
  const value = (raw !== undefined && raw !== '') ? raw.trim() : (fallback ?? undefined);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function parsePort(raw: string | undefined): number {
  if (raw === undefined || raw === '') return 3001;
  const trimmed = raw.trim();
  const parsed = Number(trimmed);
  if (Number.isNaN(parsed) || parsed < 1 || parsed > 65535) {
    throw new Error(`Invalid PORT value: "${raw}". Must be a number between 1 and 65535.`);
  }
  return parsed;
}

const jwtSecret = requireEnv('JWT_SECRET', 'dev-secret-change-me-abcdefghijklmnopqrstuvwxyz123');
if (process.env.NODE_ENV !== 'development' && jwtSecret.length < 32) {
  throw new Error('CRITICAL CONFIGURATION ERROR: JWT_SECRET must be at least 32 characters long in non-development environments');
}

const rpcUrl = requireEnv('RPC_URL', 'https://soroban-testnet.stellar.org');

export const env: AppConfig = {
  nodeEnv: (process.env.NODE_ENV?.trim() || 'development'),
  port: parsePort(process.env.PORT),
  databaseUrl: process.env.DATABASE_URL?.trim() ?? '',
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN?.trim() ?? '1h',
  webOrigin: process.env.WEB_ORIGIN?.trim() ?? 'http://localhost:3000',
  stellarNetwork: (process.env.STELLAR_NETWORK?.trim() as 'testnet' | 'public') ?? 'testnet',
  rpcUrl,
};

export function validateEnv(): AppConfig {
  if (!env.databaseUrl) {
    throw new Error('DATABASE_URL is required but not set');
  }
  if (!env.jwtSecret) {
    throw new Error('JWT_SECRET is required but not set');
  }
  if (!env.rpcUrl) {
    throw new Error('RPC_URL is required but not set');
  }
  return env;
}
