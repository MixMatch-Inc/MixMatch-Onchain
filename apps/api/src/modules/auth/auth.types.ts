import type { AuthTokenResponse, AuthUser } from '@mixmatch/shared';
import type { AuthTokenResponse, AuthUser, TokenPair } from '@mixmatch/shared';
import type { LoginSchema, RegisterSchema } from '@mixmatch/shared';

export type RegisterDto = RegisterSchema;
export type LoginDto = LoginSchema;

export type { AuthTokenResponse, AuthUser };
export type { AuthTokenResponse, AuthUser, TokenPair };
