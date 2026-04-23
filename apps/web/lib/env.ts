import { webManifest, validateServiceEnv, formatValidationErrors } from '@mixmatch/env-manifest';

// Validate environment variables on startup
const validationResult = validateServiceEnv(webManifest, process.env);

if (!validationResult.valid) {
  const errorMessage = formatValidationErrors(webManifest, validationResult);
  console.error(errorMessage);
  throw new Error(errorMessage);
}

const requiredPublicEnv = (name: 'NEXT_PUBLIC_API_URL'): string => {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required public environment variable: ${name}`);
  }

  return value;
};

export const webEnv = {
  apiUrl: requiredPublicEnv('NEXT_PUBLIC_API_URL'),
};

