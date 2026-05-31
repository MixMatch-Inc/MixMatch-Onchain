import type { Request, Response } from "express";
import { getStellarHandshake } from "../../services/stellar.service.js";
import { sendSuccess } from "../../utils/api-response.js";

export const stellarHandshakeHandler = async (_req: Request, res: Response): Promise<void> => {
  const handshake = await getStellarHandshake();
  sendSuccess(res, 200, handshake);
};
