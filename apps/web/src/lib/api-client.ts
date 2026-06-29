import type { AuthTokenResponse, AuthUser, LoginInput, RegisterInput } from '@mixmatch/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export class ApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(data?.error?.message ?? 'Something went wrong');
  }

  return data as T;
}

async function getJson<T>(path: string, token: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(data?.error?.message ?? 'Something went wrong');
  }

  return data as T;
}

export function registerUser(input: RegisterInput): Promise<AuthTokenResponse> {
  return postJson<AuthTokenResponse>('/api/auth/register', input);
}

export function loginUser(input: LoginInput): Promise<AuthTokenResponse> {
  return postJson<AuthTokenResponse>('/api/auth/login', input);
}

export async function me(token: string): Promise<AuthUser> {
  const result = await getJson<{ user: AuthUser }>('/api/auth/me', token);
  return result.user;
}
