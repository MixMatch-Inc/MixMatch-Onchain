import type { Request, Response } from "express";
<<<<<<< HEAD
import { loginSchema } from "./auth.validation.js";
import { authenticateAccount } from "./login.service.js";
import { buildSessionBootstrap } from "./signup.service.js";
import { getStellarHandshake, defaultWalletBootstrap, mapHandshakeToWalletBootstrap } from "../../services/stellar.service.js";
import { sendSuccess } from "../../utils/api-response.js";
import { ValidationError } from "../../utils/errors.js";

=======
import { loginSchema } from "./login.validation.js";
import { authenticate, buildLoginSession } from "./login.service.js";
import { sendSuccess } from "../../utils/api-response.js";
import { ValidationError } from "../../utils/errors.js";

/**
 * POST /api/v1/auth/login
 *
 * Validates credentials, authenticates the user, and returns a signed JWT
 * together with the session bootstrap payload. All error states propagate
 * to the global error middleware so callers always receive a consistent envelope.
 */
>>>>>>> origin/fix/issue-368-login-recovery-web
export const loginHandler = async (req: Request, res: Response): Promise<void> => {
  const parsed = loginSchema.safeParse(req.body);

  if (!parsed.success) {
    throw ValidationError.invalidInput("body", req.body, "Validation failed");
  }

<<<<<<< HEAD
  const authResult = await authenticateAccount(parsed.data);

  let wallet = defaultWalletBootstrap();
  try {
    const handshake = await getStellarHandshake();
    wallet = mapHandshakeToWalletBootstrap(handshake);
  } catch (error) {
    console.warn("stellar-service handshake unavailable", error instanceof Error ? error.message : error);
  }

  const bootstrap = buildSessionBootstrap(authResult.user.id, authResult.user.role, wallet);

  sendSuccess(res, 200, {
    token: authResult.token,
    refreshToken: authResult.refreshToken,
=======
  const authResult = await authenticate(parsed.data);
  const bootstrap = buildLoginSession(authResult.user.id, authResult.user.role);

  sendSuccess(res, 200, {
    token: authResult.token,
>>>>>>> origin/fix/issue-368-login-recovery-web
    user: authResult.user,
    session: bootstrap,
  });
};
<<<<<<< HEAD

export const loginErrorStatus: Record<string, number> = {
  AUTH_INVALID_CREDENTIALS: 401,
  VALIDATION_INVALID_INPUT: 422,
};
=======
>>>>>>> origin/fix/issue-368-login-recovery-web
