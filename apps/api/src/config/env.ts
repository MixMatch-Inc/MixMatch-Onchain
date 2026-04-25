import dotenv from 'dotenv';
import { apiManifest, validateServiceEnv, formatValidationErrors } from '@mixmatch/env-manifest';

dotenv.config();

// Validate environment variables on startup
const validationResult = validateServiceEnv(apiManifest, process.env);

if (!validationResult.valid) {
  const errorMessage = formatValidationErrors(apiManifest, validationResult);
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

export const apiEnv = {
  nodeEnv: optionalEnv('NODE_ENV', 'development'),
  port: Number(optionalEnv('PORT', '3001')),
  mongoUri: requireEnv('MONGO_URI'),
  jwtSecret: requireEnv('JWT_SECRET'),
  corsOrigin: optionalEnv('CORS_ORIGIN', 'http://localhost:3000'),
  logLevel: optionalEnv('LOG_LEVEL', 'info'),
  internalServiceSecret: optionalEnv('INTERNAL_SERVICE_SECRET', ''),
  metricsAuthToken: optionalEnv('METRICS_AUTH_TOKEN', ''),
};
