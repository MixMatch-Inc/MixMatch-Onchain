import { env } from './env';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  token?: string | null;
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { body, headers, token, signal, ...rest } = options;

  const res = await fetch(`${env.apiUrl}${path}`, {
    ...rest,
    signal,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers as Record<string, string>),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const payload = (await res.json().catch(() => null)) as {
    message?: string;
    error?: { message?: string; details?: unknown };
  } | null;

  if (!res.ok) {
    throw new ApiError(
      payload?.error?.message ?? payload?.message ?? 'Request failed',
      res.status,
      payload?.error?.details,
    );
  }

  return payload as T;
}
