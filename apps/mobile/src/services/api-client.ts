const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

export class ApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokenResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken?: string;
}

export interface RegisterInput {
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

/** Generic request helper — exported so other services (e.g. payments) can reuse it. */
export async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(data?.error?.message ?? 'Something went wrong');
  }

  return data as T;
}

function postJson<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, { method: 'POST', body: JSON.stringify(body) });
}

function getJson<T>(path: string, accessToken: string): Promise<T> {
  return request<T>(path, {
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
  });
}

export function registerUser(input: RegisterInput): Promise<AuthTokenResponse> {
  return postJson<AuthTokenResponse>('/api/auth/register', input);
}

export function loginUser(input: LoginInput): Promise<AuthTokenResponse> {
  return postJson<AuthTokenResponse>('/api/auth/login', input);
}

export function getMe(accessToken: string): Promise<{ user: AuthUser }> {
  return getJson<{ user: AuthUser }>('/api/auth/me', accessToken);
}

export function refreshToken(refreshToken: string): Promise<AuthTokenResponse> {
  return postJson<AuthTokenResponse>('/api/auth/refresh', { refreshToken });
}
