if (process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_API_URL) {
  throw new Error('NEXT_PUBLIC_API_URL is required in production builds');
}
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export class ApiError extends Error {
  code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
  }
}

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });

  const data: unknown = await response.json().catch(() => undefined);

  if (!response.ok) {
    const err = data as { message?: string | string[]; code?: string } | undefined;
    const message = Array.isArray(err?.message) ? err?.message[0] : err?.message;
    throw new ApiError(message ?? 'Something went wrong', err?.code);
  }

  return data as T;
}

export function authHeaders(accessToken: string): HeadersInit {
  return { Authorization: `Bearer ${accessToken}` };
}
