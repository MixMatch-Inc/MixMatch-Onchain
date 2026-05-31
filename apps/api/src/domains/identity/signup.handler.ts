import type { Request, Response } from "express";
import { registerSchema } from "./auth.validation.js";
import { createAccount, buildSessionBootstrap } from "./signup.service.js";
import { getStellarHandshake, defaultWalletBootstrap, mapHandshakeToWalletBootstrap } from "../../services/stellar.service.js";
import { sendSuccess } from "../../utils/api-response.js";
import { ValidationError } from "../../utils/errors.js";

/**
 * POST /api/v1/auth/register
 *
 * Validates the request body, delegates account creation to the service layer,
 * and returns a signed JWT together with the first-session bootstrap payload.
 * All error states (duplicate email, validation failure, unknown) propagate to
 * the global error middleware so callers always receive a consistent envelope.
 */
export const signupHandler = async (req: Request, res: Response): Promise<void> => {
  const parsed = registerSchema.safeParse(req.body);

  if (!parsed.success) {
    throw ValidationError.invalidInput("body", req.body, "Validation failed");
  }

  const authResult = await createAccount(parsed.data);

  let wallet = defaultWalletBootstrap();
  try {
    const handshake = await getStellarHandshake();
    wallet = mapHandshakeToWalletBootstrap(handshake);
  } catch (error) {
    console.warn("stellar-service handshake unavailable", error instanceof Error ? error.message : error);
  }

  const bootstrap = buildSessionBootstrap(authResult.user.id, authResult.user.role, wallet);

  sendSuccess(res, 201, {
    token: authResult.token,
    refreshToken: authResult.refreshToken,
    user: authResult.user,
    session: bootstrap,
  });
};

/**
 * Maps known signup error codes to HTTP status codes.
 * Used by tests and can be extended for new error variants.
 */
export const signupErrorStatus: Record<string, number> = {
  AUTH_EMAIL_EXISTS: 409,
  VALIDATION_INVALID_INPUT: 422,
};
