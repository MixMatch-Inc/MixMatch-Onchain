import { Request, Response } from "express";
import { loginSchema } from "./login.validation";
import { loginUser } from "./login.service";
import { sendSuccess } from "../../utils/api-response";

export async function loginHandler(req: Request, res: Response): Promise<void> {
  const input = loginSchema.parse(req.body);
  const result = await loginUser(input);
  sendSuccess(res, result);
}
