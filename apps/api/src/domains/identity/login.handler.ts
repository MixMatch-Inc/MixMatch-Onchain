import type { Request, Response } from "express";
import { loginSchema } from "./auth.validation.js";
import { authenticateAccount } from "./login.service.js";
import { buildSessionBootstrap } from "./signup.service.js";
import { getStellarHandshake, defaultWalletBootstrap, mapHandshakeToWalletBootstrap } from "../../services/stellar.service.js";
import { sendSuccess } from "../../utils/api-response.js";
import { ValidationError } from "../../utils/errors.js";

export const loginHandler = async (req: Request, res: Response): Promise<void> => {
  const parsed = loginSchema.safeParse(req.body);

  if (!parsed.success) {
    throw ValidationError.invalidInput("body", req.body, "Validation failed");
  }

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
    user: authResult.user,
    session: bootstrap,
  });
};

export const loginErrorStatus: Record<string, number> = {
  AUTH_INVALID_CREDENTIALS: 401,
  VALIDATION_INVALID_INPUT: 422,
};
