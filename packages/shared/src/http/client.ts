/**
 * Shared HTTP client for MixMatch web and mobile apps (issue #1475).
 *
 * Usage:
 *   const client = createMixMatchClient({
 *     baseUrl: process.env.NEXT_PUBLIC_API_URL,
 *     storage: webStorage,
 *   });
 *   const result = await client.get('/api/health');
 *
 * Not wired into apps/web or apps/mobile yet; both still use their own
 * api-client.ts. This helper is a standalone implementation ready for adoption.
 */

export interface TokenStorage {
  getAccessToken(): string | null | Promise<string | null>;
  setAccessToken(token: string): void | Promise<void>;
  clearTokens(): void | Promise<void>;
}

export interface MixMatchClientConfig {
  baseUrl: string;
  storage: TokenStorage;
  /** Custom fetch implementation (defaults to globalThis.fetch). */
  fetchImpl?: typeof fetch;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface MixMatchClient {
  get<T>(path: string, init?: RequestInit): Promise<T>;
  post<T>(path: string, body: unknown, init?: RequestInit): Promise<T>;
  put<T>(path: string, body: unknown, init?: RequestInit): Promise<T>;
  delete<T>(path: string, init?: RequestInit): Promise<T>;
}

/**
 * Create a typed HTTP client with automatic bearer-token injection
 * and a pluggable storage backend.
 */
export function createMixMatchClient(config: MixMatchClientConfig): MixMatchClient {
  const { baseUrl, storage, fetchImpl = globalThis.fetch } = config;

  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = await storage.getAccessToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(init.headers as Record<string, string>),
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetchImpl(`${baseUrl}${path}`, { ...init, headers });
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new ApiError(
        response.status,
        errorBody.code ?? 'UNKNOWN_ERROR',
        errorBody.message ?? response.statusText,
        errorBody.details,
      );
    }
    if (response.status === 204) return undefined as T;
    return response.json() as Promise<T>;
  }

  return {
    get: (path, init) => request(path, { ...init, method: 'GET' }),
    post: (path, body, init) =>
      request(path, { ...init, method: 'POST', body: JSON.stringify(body) }),
    put: (path, body, init) =>
      request(path, { ...init, method: 'PUT', body: JSON.stringify(body) }),
    delete: (path, init) => request(path, { ...init, method: 'DELETE' }),
  };
}

/** localStorage-backed storage adapter for web. */
export const webStorage: TokenStorage = {
  getAccessToken: () => localStorage.getItem('mm_access_token'),
  setAccessToken: (t) => localStorage.setItem('mm_access_token', t),
  clearTokens: () => {
    localStorage.removeItem('mm_access_token');
    localStorage.removeItem('mm_refresh_token');
  },
};
