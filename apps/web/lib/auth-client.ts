import type { AuthTokenResponse, LoginInput, RegisterInput } from '@mixmatch/shared';
import { request } from './api-client';

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
