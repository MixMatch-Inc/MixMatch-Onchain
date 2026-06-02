import type { Request, Response } from "express";
import { z } from "zod";
import { sendSuccess } from "../../utils/api-response.js";
import { ValidationError } from "../../utils/errors.js";
import {
  confirmAccountRecovery,
  confirmEmailVerification,
  confirmOwnershipProof,
  requestAccountRecovery,
  requestEmailVerification,
  requestOwnershipProof,
  resetPasswordWithRecoveryGrant,
} from "./recovery.service.js";

const emailVerificationRequestSchema = z.object({
  email: z.string().email(),
});

const ownershipProofRequestSchema = z.object({
  subjectType: z.literal("email"),
  subject: z.string().email(),
  purpose: z.enum([
    "email_verification",
    "account_recovery",
    "session_recovery",
  ]),
});

const challengeConfirmationSchema = z.object({
  challengeId: z.string().min(1),
  code: z.string().length(6),
});

const accountRecoveryRequestSchema = z.object({
  email: z.string().email(),
  purpose: z.enum(["account_recovery", "session_recovery"]).optional(),
});

const passwordResetSchema = z.object({
  recoveryToken: z.string().min(1),
  newPassword: z.string().min(8),
});

export const ownershipProofRequestHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const parsed = ownershipProofRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    throw ValidationError.invalidInput(
      "body",
      req.body,
      "subjectType, subject, and purpose are required",
    );
  }

  sendSuccess(res, 202, await requestOwnershipProof(parsed.data));
};

export const ownershipProofConfirmHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const parsed = challengeConfirmationSchema.safeParse(req.body);
  if (!parsed.success) {
    throw ValidationError.invalidInput(
      "body",
      req.body,
      "challengeId and 6-digit code are required",
    );
  }

  sendSuccess(res, 200, await confirmOwnershipProof(parsed.data));
};

export const emailVerificationRequestHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const parsed = emailVerificationRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    throw ValidationError.invalidInput("body", req.body, "email is required");
  }

  sendSuccess(res, 202, await requestEmailVerification(parsed.data));
};

export const emailVerificationConfirmHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const parsed = challengeConfirmationSchema.safeParse(req.body);
  if (!parsed.success) {
    throw ValidationError.invalidInput(
      "body",
      req.body,
      "challengeId and 6-digit code are required",
    );
  }

  sendSuccess(res, 200, await confirmEmailVerification(parsed.data));
};

export const accountRecoveryRequestHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const parsed = accountRecoveryRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    throw ValidationError.invalidInput("body", req.body, "email is required");
  }

  sendSuccess(res, 202, await requestAccountRecovery(parsed.data));
};

export const accountRecoveryConfirmHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const parsed = challengeConfirmationSchema.safeParse(req.body);
  if (!parsed.success) {
    throw ValidationError.invalidInput(
      "body",
      req.body,
      "challengeId and 6-digit code are required",
    );
  }

  sendSuccess(res, 200, await confirmAccountRecovery(parsed.data));
};

export const passwordRecoveryResetHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const parsed = passwordResetSchema.safeParse(req.body);
  if (!parsed.success) {
    throw ValidationError.invalidInput(
      "body",
      req.body,
      "recoveryToken and newPassword are required",
    );
  }

  sendSuccess(res, 200, await resetPasswordWithRecoveryGrant(parsed.data));
};
