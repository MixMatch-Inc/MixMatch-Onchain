import type { AuthTokenResponse, LoginInput, RegisterInput } from '@mixmatch/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export class ApiError extends Error {
  code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
  }
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data: unknown = await response.json();

  if (!response.ok) {
    const err = data as { error?: { message?: string; code?: string } };
    throw new ApiError(err?.error?.message ?? 'Something went wrong', err?.error?.code);
  }

  return data as T;
}

export function registerUser(input: RegisterInput): Promise<AuthTokenResponse> {
  return postJson<AuthTokenResponse>('/api/auth/register', input);
}

export function loginUser(input: LoginInput): Promise<AuthTokenResponse> {
  return postJson<AuthTokenResponse>('/api/auth/login', input);
}

export function refreshAccessToken(refreshToken: string): Promise<AuthTokenResponse> {
  return postJson<AuthTokenResponse>('/api/auth/refresh', { refreshToken });
}

export function fetchAuthenticated<T>(
  path: string,
  accessToken: string,
  options?: RequestInit,
): Promise<T> {
  return fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
      Authorization: `Bearer ${accessToken}`,
    },
  }).then(async (response) => {
    const data: unknown = await response.json();
    if (!response.ok) {
      const err = data as { error?: { message?: string; code?: string } };
      throw new ApiError(err?.error?.message ?? 'Something went wrong', err?.error?.code);
    }
    return data as T;
  });
}
