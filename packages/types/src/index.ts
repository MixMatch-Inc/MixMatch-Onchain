export interface ApiHealthResponse {
  service: "api";
  status: "ok";
  timestamp: string;
  version: string;
}

export interface StellarHealthResponse {
  service: "stellar-service";
  status: "ok";
  networkPassphrase: string;
  horizonUrl: string;
  timestamp: string;
}

export interface StarterRoadmapCard {
  title: string;
  body: string;
}

export type AuthContractFlow =
  | "email-verification"
  | "password-recovery"
  | "ownership-proof";

export type AuthContractStatus =
  | "verification-requested"
  | "recovery-requested"
  | "proof-required"
  | "verified"
  | "expired";

export interface EmailVerificationRequest {
  email: string;
  redirectUrl?: string;
}

export interface EmailVerificationResponse {
  flow: "email-verification";
  status: Extract<AuthContractStatus, "verification-requested">;
  maskedEmail: string;
  expiresInSeconds: number;
}

export interface PasswordRecoveryRequest {
  email: string;
  redirectUrl?: string;
}

export interface PasswordRecoveryResponse {
  flow: "password-recovery";
  status: Extract<AuthContractStatus, "recovery-requested">;
  maskedEmail: string;
  expiresInSeconds: number;
}

export interface OwnershipProofChallengeRequest {
  userId: string;
  walletPublicKey?: string;
}

export interface OwnershipProofChallengeResponse {
  flow: "ownership-proof";
  status: Extract<AuthContractStatus, "proof-required">;
  challengeId: string;
  message: string;
  expiresInSeconds: number;
}

export interface OwnershipProofVerificationRequest {
  challengeId: string;
  signature: string;
}

export interface OwnershipProofVerificationResponse {
  flow: "ownership-proof";
  status: Extract<AuthContractStatus, "verified" | "expired">;
  verifiedAt?: string;
}

export interface AuthContractCatalogResponse {
  milestone: "Authentication";
  version: "0.1.0";
  flows: Array<{
    flow: AuthContractFlow;
    requestType: string;
    responseType: string;
    owner: "apps/api";
  }>;
}
