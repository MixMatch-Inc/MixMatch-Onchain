import { Request, Response } from "express";
import { z } from "zod";
import type { StellarAuthRiskNotice } from "@themixmatch/types";
import { logAuthEvent } from "../../middleware/audit-log.js";

const STELLAR_SERVICE_URL = (process.env.STELLAR_SERVICE_URL ?? "http://localhost:3002").replace(/\/$/, "");

const stellarVerifySchema = z.object({
  sessionToken: z.string().min(1, "Session token is required"),
  stellarPublicKey: z.string().min(1, "Stellar public key is required"),
});

/**
 * Verify an authenticated session and link it to a Stellar account.
 * Emits audit entries for both the attempt and the outcome.
 */
export async function stellarAuthVerifyHandler(req: Request, res: Response): Promise<void> {
  const parsed = stellarVerifySchema.safeParse(req.body);
  if (!parsed.success) {
    const notice: StellarAuthRiskNotice = {
      type: "invalid_key",
      message: parsed.error.issues[0]?.message ?? "Invalid input",
      action: "retry_later",
    };
    res.status(422).json({ success: false, code: "VALIDATION_ERROR", ...notice });
    return;
  }

  const { sessionToken, stellarPublicKey } = parsed.data;
  logAuthEvent("stellar_verify", { req, boundary: "stellar", meta: { keyPrefix: stellarPublicKey.slice(0, 8) } });

  try {
    const response = await fetch(`${STELLAR_SERVICE_URL}/api/v1/stellar/auth/verify`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionToken, stellarPublicKey }),
    });

    const data = await response.json() as Record<string, unknown>;

    if (response.ok) {
      logAuthEvent("login_success", { req, boundary: "stellar" });
    } else {
      const riskNotice: StellarAuthRiskNotice = {
        type: "session_risk",
        message: typeof data.message === "string" ? data.message : "Session verification failed",
        action: "re_authenticate",
      };
      res.status(response.status).json({ ...data, notice: riskNotice });
      return;
    }

    res.status(response.status).json(data);
  } catch {
    logAuthEvent("login_failure", { req, boundary: "stellar", meta: { reason: "service_unavailable" } });
    const notice: StellarAuthRiskNotice = {
      type: "service_unavailable",
      message: "Stellar service is unavailable — please retry shortly.",
      action: "retry_later",
    };
    res.status(502).json({ success: false, code: "STELLAR_SERVICE_UNAVAILABLE", notice });
  }
}

const stellarChallengeSchema = z.object({
  stellarPublicKey: z.string().min(1, "Stellar public key is required"),
});

/**
 * Generate a Stellar challenge for wallet-based login recovery.
 * Emits audit entries and attaches a risk notice on failure paths.
 */
export async function stellarAuthChallengeHandler(req: Request, res: Response): Promise<void> {
  const parsed = stellarChallengeSchema.safeParse(req.body);
  if (!parsed.success) {
    const notice: StellarAuthRiskNotice = {
      type: "invalid_key",
      message: parsed.error.issues[0]?.message ?? "Invalid input",
      action: "retry_later",
    };
    res.status(422).json({ success: false, code: "VALIDATION_ERROR", ...notice });
    return;
  }

  logAuthEvent("stellar_challenge", { req, boundary: "stellar", meta: { keyPrefix: parsed.data.stellarPublicKey.slice(0, 8) } });

  try {
    const response = await fetch(`${STELLAR_SERVICE_URL}/api/v1/stellar/auth/challenge`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(parsed.data),
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch {
    logAuthEvent("login_failure", { req, boundary: "stellar", meta: { reason: "service_unavailable" } });
    const notice: StellarAuthRiskNotice = {
      type: "service_unavailable",
      message: "Stellar service is unavailable — please retry shortly.",
      action: "retry_later",
    };
    res.status(502).json({ success: false, code: "STELLAR_SERVICE_UNAVAILABLE", notice });
  }
}
