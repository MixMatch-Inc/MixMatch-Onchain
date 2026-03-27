const fallbackBaseUrl = 'http://localhost:3002';

export const stellarServiceConfig = {
  baseUrl: process.env.STELLAR_SERVICE_URL?.trim() || fallbackBaseUrl,
  sharedSecret: process.env.STELLAR_SERVICE_SHARED_SECRET?.trim() || '',
  timeoutMs: Number(process.env.STELLAR_SERVICE_TIMEOUT_MS || 8000),
};
