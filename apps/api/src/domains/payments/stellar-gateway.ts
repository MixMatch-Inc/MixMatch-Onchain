import { stellarServiceConfig } from '../../config/stellar-service';

export class StellarGatewayError extends Error {
  status: number;

  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'StellarGatewayError';
    this.status = status;
    this.details = details;
  }
}

const withTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number,
): Promise<T> => {
  return await Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new StellarGatewayError('Stellar service timeout', 504)), timeoutMs);
    }),
  ]);
};

const buildHeaders = (): Record<string, string> => ({
  'Content-Type': 'application/json',
  ...(stellarServiceConfig.sharedSecret
    ? { 'x-mixmatch-service-secret': stellarServiceConfig.sharedSecret }
    : {}),
});

export const stellarGatewayRequest = async <T>(
  path: string,
  init: RequestInit = {},
): Promise<T> => {
  const response = await withTimeout(
    fetch(`${stellarServiceConfig.baseUrl}${path}`, {
      ...init,
      headers: {
        ...buildHeaders(),
        ...(init.headers || {}),
      },
    }),
    stellarServiceConfig.timeoutMs,
  );

  const payload = (await response.json().catch(() => null)) as
    | { error?: string; message?: string }
    | null;

  if (!response.ok) {
    throw new StellarGatewayError(
      payload?.error || payload?.message || 'Stellar service request failed',
      response.status,
      payload,
    );
  }

  return payload as T;
};

export interface StellarAccountResponse {
  exists: boolean;
  publicKey: string;
  balances: Array<{ asset: string; balance: string }>;
}

export interface StellarPaymentRequest {
  destination: string;
  amount: string;
  memo?: string;
}

export interface StellarPaymentResponse {
  success: boolean;
  hash: string;
  message: string;
}

export const checkStellarAccount = (publicKey: string) =>
  stellarGatewayRequest<StellarAccountResponse>(`/account/${publicKey}`);

export const createStellarPayment = (input: StellarPaymentRequest) =>
  stellarGatewayRequest<StellarPaymentResponse>('/payment', {
    method: 'POST',
    body: JSON.stringify(input),
  });
