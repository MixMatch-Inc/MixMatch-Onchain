import type { AuthTokenResponse, AuthUser } from '@mixmatch/shared';
import type { LoginSchema, RegisterSchema } from '@mixmatch/shared';

export type RegisterDto = RegisterSchema;
export type LoginDto = LoginSchema;

export type { AuthTokenResponse, AuthUser };
