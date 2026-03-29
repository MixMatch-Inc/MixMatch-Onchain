import dotenv from 'dotenv';

dotenv.config();

const requireEnv = (name: string): string => {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
};

const optionalEnv = (name: string, fallback: string): string => {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : fallback;
};

export const stellarEnv = {
  port: Number(optionalEnv('PORT', '3002')),
  network: optionalEnv('STELLAR_NETWORK', 'TESTNET'),
  horizonUrl: optionalEnv(
    'STELLAR_HORIZON_URL',
    'https://horizon-testnet.stellar.org',
  ),
  secretKey: requireEnv('STELLAR_SEC_KEY'),
  treasuryPublicKey: process.env.TREASURY_PUB_KEY?.trim(),
  platformFeePercent: Number(optionalEnv('PLATFORM_FEE_PERCENT', '0.1')),
};

