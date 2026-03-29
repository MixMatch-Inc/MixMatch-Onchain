import { UserRole } from '@mixmatch/types';
import { apiRequest } from './client';

export interface AuthUserPayload {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  onboardingCompleted: boolean;
}

export interface AuthResponse {
  token: string;
  user: AuthUserPayload;
}

export interface RegisterInput {
  email: string;
  password: string;
  role: UserRole;
}

export const registerUser = async (
  input: RegisterInput,
): Promise<AuthResponse> => {
  return apiRequest<AuthResponse>('/auth/register', {
    method: 'POST',
    body: input,
  });
};
