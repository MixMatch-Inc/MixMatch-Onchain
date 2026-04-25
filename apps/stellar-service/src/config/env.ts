import dotenv from 'dotenv';
import { stellarManifest, validateServiceEnv, formatValidationErrors } from '@mixmatch/env-manifest';

dotenv.config();

// Validate environment variables on startup
const validationResult = validateServiceEnv(stellarManifest, process.env);

if (!validationResult.valid) {
  const errorMessage = formatValidationErrors(stellarManifest, validationResult);
  console.error(errorMessage);
  process.exit(1);
}

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
  nodeEnv: optionalEnv('NODE_ENV', 'development'),
  port: Number(optionalEnv('PORT', '3002')),
  network: optionalEnv('STELLAR_NETWORK', 'TESTNET'),
  horizonUrl: optionalEnv(
    'STELLAR_HORIZON_URL',
    'https://horizon-testnet.stellar.org',
  ),
  secretKey: requireEnv('STELLAR_SEC_KEY'),
  treasuryPublicKey: process.env.TREASURY_PUB_KEY?.trim(),
  platformFeePercent: Number(optionalEnv('PLATFORM_FEE_PERCENT', '0.1')),
  logLevel: optionalEnv('LOG_LEVEL', 'info'),
  internalServiceSecret: optionalEnv('INTERNAL_SERVICE_SECRET', ''),
  metricsAuthToken: optionalEnv('METRICS_AUTH_TOKEN', ''),
};
