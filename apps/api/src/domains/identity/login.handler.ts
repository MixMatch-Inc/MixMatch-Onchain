import type { Request, Response } from "express";
import { loginSchema } from "./login.validation.js";
import { authenticate, buildLoginSession } from "./login.service.js";
import { sendSuccess } from "../../utils/api-response.js";
import { ValidationError } from "../../utils/errors.js";

export const loginHandler = async (req: Request, res: Response): Promise<void> => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    throw ValidationError.invalidInput("body", req.body, "Validation failed");
  }
  const authResult = await authenticate(parsed.data);
  const bootstrap = buildLoginSession(authResult.user.id, authResult.user.role);
  sendSuccess(res, 200, { token: authResult.token, user: authResult.user, session: bootstrap });
};
