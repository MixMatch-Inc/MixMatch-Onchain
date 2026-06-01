import { Keypair, Networks, TransactionBuilder, Operation, BASE_FEE, Account } from "@stellar/stellar-sdk";
import dotenv from "dotenv";
import express, { type Request, type Response, type NextFunction } from "express";
import { z } from "zod";

import type {
  StellarHealthResponse,
  StellarServiceHandshake,
  StellarAuthChallengeResponse,
  StellarAuthVerifyResponse,
  AuthAuditEntry,
  AuthRateLimitError,
} from "@themixmatch/types";

dotenv.config();

const envSchema = z.object({
  STELLAR_SERVICE_PORT: z.coerce.number().default(3002),
  STELLAR_NETWORK_PASSPHRASE: z.string().default(Networks.TESTNET),
  STELLAR_HORIZON_URL: z.string().url().default("https://horizon-testnet.stellar.org"),
  STELLAR_SIGNING_KEY: z.string().optional(),
});

const env = envSchema.parse(process.env);

// ---------------------------------------------------------------------------
// Abuse controls — in-process rate limiter and audit logger
// ---------------------------------------------------------------------------

interface RateLimitEntry { count: number; resetAt: number; }
const _rlStore = new Map<string, RateLimitEntry>();

function stellarRateLimit(maxReq: number, windowMs: number) {
  return function (req: Request, res: Response, next: NextFunction): void {
    const key = req.ip ?? "unknown";
    const now = Date.now();
    const existing = _rlStore.get(key);
    let entry: RateLimitEntry;
    if (!existing || now >= existing.resetAt) {
      entry = { count: 1, resetAt: now + windowMs };
    } else {
      existing.count++;
      entry = existing;
    }
    _rlStore.set(key, entry);
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    res.setHeader("X-RateLimit-Limit", String(maxReq));
    res.setHeader("X-RateLimit-Remaining", String(Math.max(0, maxReq - entry.count)));
    res.setHeader("X-RateLimit-Reset", String(Math.ceil(entry.resetAt / 1000)));
    if (entry.count > maxReq) {
      res.setHeader("Retry-After", String(retryAfter));
      const body: { success: false } & AuthRateLimitError = {
        success: false,
        code: "AUTH_RATE_LIMITED",
        message: "Too many requests — please wait before retrying.",
        retryAfter,
      };
      res.status(429).json(body);
      return;
    }
    next();
  };
}

function logStellarAudit(event: AuthAuditEntry["event"], req: Request, meta?: Record<string, unknown>): void {
  const entry: AuthAuditEntry = {
    event,
    ip: req.ip ?? req.headers["x-forwarded-for"]?.toString(),
    timestamp: new Date().toISOString(),
    boundary: "stellar",
    meta,
  };
  console.log(JSON.stringify({ audit: entry }));
}

// 5 requests per 15 min per IP on auth endpoints
const authLimit = stellarRateLimit(5, 15 * 60 * 1000);

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

app.post("/api/v1/stellar/auth/challenge", authLimit, (req: Request, res: Response) => {
  const parsed = challengeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ success: false, code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid input" });
    return;
  }

  const { stellarPublicKey } = parsed.data;
  logStellarAudit("stellar_challenge", req, { keyPrefix: stellarPublicKey.slice(0, 8) });

  const now = Math.floor(Date.now() / 1000);
  const expiresAt = new Date((now + 300) * 1000).toISOString();

  const sourceKeypair = Keypair.random();
  const sourceAccount = new Account(sourceKeypair.publicKey(), "0");
  const tx = new TransactionBuilder(sourceAccount, {
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

app.post("/api/v1/stellar/auth/verify", authLimit, (req: Request, res: Response) => {
  const parsed = verifySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ success: false, code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid input" });
    return;
  }

  const { sessionToken, stellarPublicKey } = parsed.data;
  logStellarAudit("stellar_verify", req, { keyPrefix: stellarPublicKey.slice(0, 8) });

  if (!sessionToken.startsWith("local.") && !sessionToken.startsWith("eyJ")) {
    logStellarAudit("login_failure", req, { reason: "invalid_session_token" });
    res.status(401).json({ success: false, code: "AUTH_INVALID_SESSION", message: "Invalid session token" });
    return;
  }

  let stellarAccountId: string;
  try {
    stellarAccountId = Keypair.fromPublicKey(stellarPublicKey).publicKey();
  } catch {
    logStellarAudit("login_failure", req, { reason: "invalid_stellar_key" });
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
