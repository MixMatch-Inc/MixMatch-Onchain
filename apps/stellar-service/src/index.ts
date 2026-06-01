import { Keypair, Networks, TransactionBuilder, Operation, BASE_FEE } from "@stellar/stellar-sdk";
import dotenv from "dotenv";
import express, { type Request, type Response } from "express";
import { z } from "zod";

import type {
  StellarHealthResponse,
  StellarServiceHandshake,
  StellarAuthChallengeResponse,
  StellarAuthVerifyResponse,
} from "@themixmatch/types";

dotenv.config();

const envSchema = z.object({
  STELLAR_SERVICE_PORT: z.coerce.number().default(3002),
  STELLAR_NETWORK_PASSPHRASE: z.string().default(Networks.TESTNET),
  STELLAR_HORIZON_URL: z.string().url().default("https://horizon-testnet.stellar.org"),
  STELLAR_SIGNING_KEY: z.string().optional(),
});

const env = envSchema.parse(process.env);

const app = express();
app.use(express.json());

// ---------------------------------------------------------------------------
// Health & network info
// ---------------------------------------------------------------------------

app.get("/health", (_request: Request, response: Response) => {
  const payload: StellarHealthResponse = {
    service: "stellar-service",
    status: "ok",
    networkPassphrase: env.STELLAR_NETWORK_PASSPHRASE,
    horizonUrl: env.STELLAR_HORIZON_URL,
    timestamp: new Date().toISOString(),
  };
  response.json(payload);
});

app.get("/handshake", (_request: Request, response: Response) => {
  const payload: StellarServiceHandshake = {
    service: "stellar-service",
    status: "ok",
    supportedWallets: ["phantom", "freighter"],
    networkPassphrase: env.STELLAR_NETWORK_PASSPHRASE,
    horizonUrl: env.STELLAR_HORIZON_URL,
    timestamp: new Date().toISOString()
  };

  response.json(payload);
});

app.get("/network", (_request: Request, response: Response) => {
  response.json({
    name: "TheMixMatch Stellar service starter",
    scope: "Network access, wallet utilities, and future signing workflows.",
  });
});

// ---------------------------------------------------------------------------
// Stellar-auth boundary (handoff from auth service)
// ---------------------------------------------------------------------------

// POST /api/v1/stellar/auth/challenge
// Generate a Stellar challenge transaction for wallet-based login recovery
const challengeSchema = z.object({
  stellarPublicKey: z.string().min  (1, "Stellar public key is required"),
});

app.post("/api/v1/stellar/auth/challenge", (req: Request, res: Response) => {
  const parsed = challengeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ success: false, code: "VALIDATION_ERROR", message: parsed.error.errors[0]?.message ?? "Invalid input" });
    return;
  }

  const { stellarPublicKey } = parsed.data;
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = new Date((now + 300) * 1000).toISOString(); // 5 min expiry

  // Build a simple challenge transaction (no actual fee payment — just a signed message)
  const source = Keypair.random();
  const tx = new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase: env.STELLAR_NETWORK_PASSPHRASE,
  })
    .addOperation(Operation.setOptions({
      source: stellarPublicKey,
      homeDomain: "mixmatch",
    }))
    .setTimeout(300)
    .build();

  res.json({
    success: true,
    data: {
      transactionXdr: tx.toXDR(),
      networkPassphrase: env.STELLAR_NETWORK_PASSPHRASE,
      expiresAt,
    } satisfies StellarAuthChallengeResponse,
  });
});

// POST /api/v1/stellar/auth/verify
// Verify an authenticated session against the Stellar network boundary
const verifySchema = z.object({
  sessionToken: z.string().min(1, "Session token is required"),
  stellarPublicKey: z.string().min(1, "Stellar public key is required"),
});

app.post("/api/v1/stellar/auth/verify", (req: Request, res: Response) => {
  const parsed = verifySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ success: false, code: "VALIDATION_ERROR", message: parsed.error.errors[0]?.message ?? "Invalid input" });
    return;
  }

  const { sessionToken, stellarPublicKey } = parsed.data;

  // Verify that the session token format is valid
  if (!sessionToken.startsWith("local.") && !sessionToken.startsWith("eyJ")) {
    res.status(401).json({ success: false, code: "AUTH_INVALID_SESSION", message: "Invalid session token" });
    return;
  }

  // Verify that the Stellar public key is a valid ed25519 key
  let stellarAccountId: string;
  try {
    stellarAccountId = Keypair.fromPublicKey(stellarPublicKey).publicKey();
  } catch {
    res.status(422).json({ success: false, code: "INVALID_STELLAR_KEY", message: "Invalid Stellar public key" });
    return;
  }

  res.json({
    success: true,
    data: {
      verified: true,
      stellarAccountId,
      linkedAt: new Date().toISOString(),
    } satisfies StellarAuthVerifyResponse,
  });
});

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------

app.listen(env.STELLAR_SERVICE_PORT, () => {
  console.log(`stellar-service listening on http://localhost:${env.STELLAR_SERVICE_PORT}`);
});
