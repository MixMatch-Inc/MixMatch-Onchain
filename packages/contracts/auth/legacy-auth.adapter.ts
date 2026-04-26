import {
  AuthContractVersion,
  LoginDto,
  SignupDto,
} from '../../../packages/contracts/auth/auth.contracts';

export class LegacyAuthAdapter {
  static signup(payload: any): SignupDto {
    return {
      version: AuthContractVersion.V1,
      email: payload.email,
      password: payload.password,
      fullName: payload.name || payload.fullName,
    };
  }

  static login(payload: any): LoginDto {
    return {
      version: AuthContractVersion.V1,
      email: payload.email,
      password: payload.password,
    };
  }
}
