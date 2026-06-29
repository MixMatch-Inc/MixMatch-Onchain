import 'dotenv/config';

function requireEnv(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

// Add strict validation for JWT_SECRET length in non-development environments
const jwtSecret = requireEnv('JWT_SECRET', 'dev-secret-change-me-abcdefghijklmnopqrstuvwxyz123');
if (process.env.NODE_ENV !== 'development' && jwtSecret.length < 32) {
  throw new Error('CRITICAL CONFIGURATION ERROR: JWT_SECRET must be at least 32 characters long in non-development environments');
}

// Validate RPC_URL is present for Stellar integration
const rpcUrl = requireEnv('RPC_URL', 'https://soroban-testnet.stellar.org');

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3001),
  databaseUrl: process.env.DATABASE_URL ?? '',
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '1h',
  webOrigin: process.env.WEB_ORIGIN ?? 'http://localhost:3000',
  stellarNetwork: (process.env.STELLAR_NETWORK as 'testnet' | 'public') ?? 'testnet',
  rpcUrl,
};