import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import type {
  AccountRecoveryConfirmRequest,
  AccountRecoveryConfirmResponse,
  AccountRecoveryRequest,
  AccountRecoveryResponse,
  EmailVerificationConfirmRequest,
  EmailVerificationConfirmResponse,
  EmailVerificationRequest,
  EmailVerificationResponse,
  OwnershipProof,
  OwnershipProofChallenge,
  OwnershipProofConfirmRequest,
  OwnershipProofConfirmResponse,
  OwnershipProofPurpose,
  OwnershipProofRequest,
  OwnershipProofResponse,
  PasswordRecoveryResetRequest,
  PasswordRecoveryResetResponse,
} from "@themixmatch/types";
import { container } from "../../config/di.js";
import { AuthError } from "../../utils/errors.js";

const CHALLENGE_TTL_MS = 15 * 60 * 1000;
const RECOVERY_GRANT_TTL_MS = 30 * 60 * 1000;
const CODE_LENGTH = 6;
const PASSWORD_SALT_ROUNDS = 10;

function createCode(): string {
  return String(Math.floor(Math.random() * 1_000_000)).padStart(
    CODE_LENGTH,
    "0",
  );
}

function maskEmail(email: string): string {
  const [localPart, domain = ""] = email.split("@");
  const visibleLocal = localPart.slice(0, Math.min(2, localPart.length));
  return `${visibleLocal}${"*".repeat(Math.max(1, localPart.length - visibleLocal.length))}@${domain}`;
}

function buildChallengeEnvelope(record: {
  challengeId: string;
  subjectType: "email";
  subject: string;
  purpose: OwnershipProofPurpose;
  expiresAt: string;
  code: string;
}): OwnershipProofChallenge {
  return {
    challengeId: record.challengeId,
    subjectType: record.subjectType,
    maskedSubject: maskEmail(record.subject),
    purpose: record.purpose,
    delivery: "simulated_email",
    expiresAt: record.expiresAt,
    codeLength: CODE_LENGTH,
    codePreview: record.code,
  };
}

async function issueOwnershipChallenge(
  input: OwnershipProofRequest,
): Promise<OwnershipProofResponse> {
  const subject = input.subject.trim().toLowerCase();
  const challengeId = randomUUID();
  const record = {
    challengeId,
    subjectType: input.subjectType,
    subject,
    purpose: input.purpose,
    code: createCode(),
    expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS).toISOString(),
  };

  await container.ownershipChallengeRepository.save(record);

  return {
    requested: true,
    challenge: buildChallengeEnvelope(record),
  };
}

async function consumeOwnershipChallenge(
  input: OwnershipProofConfirmRequest,
  expectedPurpose?: OwnershipProofPurpose,
): Promise<OwnershipProof> {
  const record = await container.ownershipChallengeRepository.findById(
    input.challengeId,
  );
  if (!record) {
    throw AuthError.invalidOwnershipProof();
  }

  if (expectedPurpose && record.purpose !== expectedPurpose) {
    throw AuthError.invalidOwnershipProof();
  }

  if (record.consumedAt) {
    throw AuthError.invalidOwnershipProof();
  }

  if (new Date(record.expiresAt).getTime() < Date.now()) {
    await container.ownershipChallengeRepository.delete(record.challengeId);
    throw AuthError.invalidOwnershipProof();
  }

  if (record.code !== input.code.trim()) {
    throw AuthError.invalidOwnershipProof();
  }

  const consumedAt = new Date().toISOString();
  await container.ownershipChallengeRepository.markConsumed(
    record.challengeId,
    consumedAt,
  );

  return {
    proofId: randomUUID(),
    subjectType: record.subjectType,
    subject: record.subject,
    purpose: record.purpose,
    verifiedAt: consumedAt,
  };
}

export async function requestOwnershipProof(
  input: OwnershipProofRequest,
): Promise<OwnershipProofResponse> {
  return issueOwnershipChallenge(input);
}

export async function confirmOwnershipProof(
  input: OwnershipProofConfirmRequest,
): Promise<OwnershipProofConfirmResponse> {
  return {
    verified: true,
    proof: await consumeOwnershipChallenge(input),
  };
}

export async function requestEmailVerification(
  input: EmailVerificationRequest,
): Promise<EmailVerificationResponse> {
  const issued = await issueOwnershipChallenge({
    subjectType: "email",
    subject: input.email,
    purpose: "email_verification",
  });

  return {
    requested: true,
    challenge: issued.challenge,
    nextStep: "confirm_email_verification",
  };
}

export async function confirmEmailVerification(
  input: EmailVerificationConfirmRequest,
): Promise<EmailVerificationConfirmResponse> {
  const proof = await consumeOwnershipChallenge(input, "email_verification");
  const verifiedAt = new Date(proof.verifiedAt);
  await container.userRepository.markEmailVerified(proof.subject, verifiedAt);

  return {
    verified: true,
    email: proof.subject,
    proof,
  };
}

export async function requestAccountRecovery(
  input: AccountRecoveryRequest,
): Promise<AccountRecoveryResponse> {
  const recoveryKind = input.purpose ?? "account_recovery";
  const issued = await issueOwnershipChallenge({
    subjectType: "email",
    subject: input.email,
    purpose: recoveryKind,
  });

  return {
    requested: true,
    challenge: issued.challenge,
    recoveryKind,
    nextStep: "confirm_account_recovery",
  };
}

export async function confirmAccountRecovery(
  input: AccountRecoveryConfirmRequest,
): Promise<AccountRecoveryConfirmResponse> {
  const proof = await consumeOwnershipChallenge(input);

  if (
    proof.purpose !== "account_recovery" &&
    proof.purpose !== "session_recovery"
  ) {
    throw AuthError.invalidOwnershipProof();
  }

  const user = await container.userRepository.findByEmail(proof.subject);
  if (!user) {
    throw AuthError.accountNotRecoverable();
  }

  const recoveryToken = `recovery.${randomUUID()}`;
  const expiresAt = new Date(Date.now() + RECOVERY_GRANT_TTL_MS).toISOString();

  await container.recoveryGrantRepository.save({
    recoveryToken,
    subject: proof.subject,
    purpose: proof.purpose,
    proofId: proof.proofId,
    expiresAt,
  });

  return {
    recovered: true,
    grant: {
      recoveryToken,
      expiresAt,
      proof,
    },
  };
}

export async function resetPasswordWithRecoveryGrant(
  input: PasswordRecoveryResetRequest,
): Promise<PasswordRecoveryResetResponse> {
  const grant = await container.recoveryGrantRepository.findByToken(
    input.recoveryToken,
  );
  if (!grant || grant.consumedAt) {
    throw AuthError.invalidRecoveryToken();
  }

  if (new Date(grant.expiresAt).getTime() < Date.now()) {
    throw AuthError.invalidRecoveryToken();
  }

  if (
    grant.purpose !== "account_recovery" &&
    grant.purpose !== "session_recovery"
  ) {
    throw AuthError.invalidRecoveryToken();
  }

  const passwordHash = await bcrypt.hash(
    input.newPassword,
    PASSWORD_SALT_ROUNDS,
  );
  const user = await container.userRepository.updatePasswordByEmail(
    grant.subject,
    passwordHash,
  );
  if (!user) {
    throw AuthError.accountNotRecoverable();
  }

  await container.refreshTokenRepository.revokeAllForUser(user.id);
  const resetAt = new Date().toISOString();
  await container.recoveryGrantRepository.markConsumed(
    grant.recoveryToken,
    resetAt,
  );

  return {
    passwordReset: true,
    userId: user.id,
    email: user.email,
    resetAt,
  };
}
