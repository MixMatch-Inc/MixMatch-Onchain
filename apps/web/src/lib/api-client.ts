import type { AuthTokenResponse, AuthUser, LoginInput, RegisterInput } from '@mixmatch/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export class ApiError extends Error {
  code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  const data: unknown = await response.json();

  if (!response.ok) {
    const err = data as { error?: { message?: string; code?: string } };
    throw new ApiError(err?.error?.message ?? 'Something went wrong', err?.error?.code);
  }

  return data as T;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

async function getJson<T>(path: string, token: string): Promise<T> {
  return request<T>(path, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
}

export function registerUser(input: RegisterInput): Promise<AuthTokenResponse> {
  return postJson<AuthTokenResponse>('/api/auth/register', input);
}

export function loginUser(input: LoginInput): Promise<AuthTokenResponse> {
  return postJson<AuthTokenResponse>('/api/auth/login', input);
}

export interface MeResponse {
  user: AuthUser;
}

export function getCurrentUser(accessToken: string): Promise<MeResponse> {
  return getJson<MeResponse>('/api/auth/me', accessToken);
}
