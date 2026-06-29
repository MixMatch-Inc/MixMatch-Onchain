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
}

export interface RegisterInput {
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
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

export function registerUser(input: RegisterInput): Promise<AuthTokenResponse> {
  return postJson<AuthTokenResponse>('/api/auth/register', input);
}

export function loginUser(input: LoginInput): Promise<AuthTokenResponse> {
  return postJson<AuthTokenResponse>('/api/auth/login', input);
}
