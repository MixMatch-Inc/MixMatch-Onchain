import type { AuthTokenResponse, LoginInput, MeResponse, RegisterInput } from '@mixmatch/shared';
import { authHeaders, request } from './api-client';

export function registerUser(input: RegisterInput): Promise<AuthTokenResponse> {
  return request<AuthTokenResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
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
