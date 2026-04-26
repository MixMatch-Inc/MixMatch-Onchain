import {
  AuthContractVersion,
  LoginDto,
  SignupDto,
} from './auth.contracts';

export function parseSignupPayload(payload: any): SignupDto {
  return {
    version: AuthContractVersion.V1,
    email: String(payload.email).trim().toLowerCase(),
    password: String(payload.password),
    fullName: String(payload.fullName).trim(),
  };
}

export function parseLoginPayload(payload: any): LoginDto {
  return {
    version: AuthContractVersion.V1,
    email: String(payload.email).trim().toLowerCase(),
    password: String(payload.password),
  };
}
