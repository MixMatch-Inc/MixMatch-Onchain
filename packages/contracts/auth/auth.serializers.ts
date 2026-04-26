import {
  LoginDto,
  SignupDto,
} from './auth.contracts';

export function serializeSignup(dto: SignupDto) {
  return JSON.stringify(dto);
}

export function serializeLogin(dto: LoginDto) {
  return JSON.stringify(dto);
}
