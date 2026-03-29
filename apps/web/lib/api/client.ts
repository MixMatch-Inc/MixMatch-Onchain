export class ApiClientError extends Error {
  status: number;

  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.details = details;
  }
}

const getApiBaseUrl = (): string => {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL?.trim();
  return fromEnv && fromEnv.length > 0 ? fromEnv : 'http://localhost:3001';
};

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  token?: string;
}

export const apiRequest = async <T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> => {
  const { body, headers, token, ...rest } = options;

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string; error?: { message?: string; details?: unknown } }
    | null;

  if (!response.ok) {
    throw new ApiClientError(
      payload?.error?.message ?? payload?.message ?? 'Request failed',
      response.status,
      payload?.error?.details,
    );
  }

  return payload as T;
};
