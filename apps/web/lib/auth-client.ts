import type {
  AuthTokenResponse,
  LoginInput,
  RegisterInput,
  RegisterResponse,
  SseTokenResponse,
} from '@mixmatch/shared';
import { authHeaders, request } from './api-client';

/**
 * Where the API requires email verification, the response carries a null
 * `accessToken` and no session is issued until the address is confirmed.
 */
export function registerUser(input: RegisterInput): Promise<RegisterResponse> {
  return request<RegisterResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/**
 * Mints a short-lived, single-use token for the SSE stream URL, so the
 * long-lived access token never appears in a URL (where proxies, load
 * balancers and browser history would record it). Mint one per connection.
 */
export function createSseToken(accessToken: string): Promise<SseTokenResponse> {
  return request<SseTokenResponse>('/auth/sse-token', {
    method: 'POST',
    headers: authHeaders(accessToken),
  });
}

export function loginUser(input: LoginInput): Promise<AuthTokenResponse> {
  return request<AuthTokenResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
