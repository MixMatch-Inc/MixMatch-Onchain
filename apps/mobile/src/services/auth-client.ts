import type {
  AuthTokenResponse,
  LoginInput,
  MeResponse,
  RegisterInput,
  RegisterResponse,
  SseTokenResponse,
} from '@mixmatch/shared';
import { authHeaders, request } from './api-client';

/**
 * Where the API requires email verification, the response carries a null
 * `accessToken` and the caller must wait for the user to confirm their
 * address before signing in.
 */
export function registerUser(input: RegisterInput): Promise<RegisterResponse> {
  return request<RegisterResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/**
 * Mints a short-lived, single-use token for the SSE stream URL. The normal
 * access token travels in a header here and never enters a URL, where
 * proxies and browser history would log it.
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

export function getCurrentUser(accessToken: string): Promise<MeResponse> {
  return request<MeResponse>('/auth/me', {
    headers: authHeaders(accessToken),
  });
}
