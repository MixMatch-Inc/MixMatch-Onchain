import { Request, Response } from "express";
import { z } from "zod";

const STELLAR_SERVICE_URL = (process.env.STELLAR_SERVICE_URL ?? "http://localhost:3002").replace(/\/$/, "");

const stellarVerifySchema = z.object({
  sessionToken: z.string().min(1, "Session token is required"),
  stellarPublicKey: z.string().min(1, "Stellar public key is required"),
});

/**
 * Verify an authenticated session and link it to a Stellar account.
 * This connects the login recovery flow to the Stellar-boundary authenticated state.
 */
export async function stellarAuthVerifyHandler(req: Request, res: Response): Promise<void> {
  const parsed = stellarVerifySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({
      success: false,
      code: "VALIDATION_ERROR",
      message: parsed.error.issues[0]?.message ?? "Invalid input",
    });
    return;
  }

  const { sessionToken, stellarPublicKey } = parsed.data;

  try {
    const response = await fetch(`${STELLAR_SERVICE_URL}/api/v1/stellar/auth/verify`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionToken, stellarPublicKey }),
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch {
    res.status(502).json({
      success: false,
      code: "STELLAR_SERVICE_UNAVAILABLE",
      message: "Stellar service is unavailable",
    });
  }
}

/**
 * Generate a Stellar challenge for wallet-based login recovery.
 * This is the entry point for connecting login recovery to the Stellar boundary.
 */
const stellarChallengeSchema = z.object({
  stellarPublicKey: z.string().min(1, "Stellar public key is required"),
});

export async function stellarAuthChallengeHandler(req: Request, res: Response): Promise<void> {
  const parsed = stellarChallengeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({
      success: false,
      code: "VALIDATION_ERROR",
      message: parsed.error.issues[0]?.message ?? "Invalid input",
    });
    return;
  }

  try {
    const response = await fetch(`${STELLAR_SERVICE_URL}/api/v1/stellar/auth/challenge`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(parsed.data),
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch {
    res.status(502).json({
      success: false,
      code: "STELLAR_SERVICE_UNAVAILABLE",
      message: "Stellar service is unavailable",
    });
  }
}
