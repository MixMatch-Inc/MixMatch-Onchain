export enum AuthContractVersion {
  V1 = 'v1',
}

export interface BaseAuthContract {
  version: AuthContractVersion;
}

export interface SignupDto extends BaseAuthContract {
  email: string;
  password: string;
  fullName: string;
}

export interface LoginDto extends BaseAuthContract {
  email: string;
  password: string;
}

export interface AuthResponseDto extends BaseAuthContract {
  token: string;
  sessionId: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    onboardingCompleted: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  };
}

export interface RefreshTokenDto extends BaseAuthContract {
  refreshToken: string;
}

export interface LogoutDto extends BaseAuthContract {
  sessionId: string;
}

export interface PasswordResetRequestDto extends BaseAuthContract {
  email: string;
}

export interface PasswordResetDto extends BaseAuthContract {
  token: string;
  newPassword: string;
}

export interface EmailVerificationDto extends BaseAuthContract {
  token: string;
}

export interface AccountRecoveryDto extends BaseAuthContract {
  email: string;
  recoveryCode: string;
}

export interface SessionIntrospectionDto extends BaseAuthContract {
  sessionId: string;
}

export interface OnboardingProgressDto extends BaseAuthContract {
  userId: string;
  completedSteps: string[];
  currentStep: string;
}

export interface ProviderLinkStatusDto extends BaseAuthContract {
  provider: 'google' | 'apple' | 'github';
  linked: boolean;
}
