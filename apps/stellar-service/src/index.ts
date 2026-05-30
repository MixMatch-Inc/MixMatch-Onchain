import { Networks } from "@stellar/stellar-sdk";
import dotenv from "dotenv";
import express, { type Request, type Response } from "express";
import { z } from "zod";

import type { StellarHealthResponse } from "@themixmatch/types";

dotenv.config();

const envSchema = z.object({
  STELLAR_SERVICE_PORT: z.coerce.number().default(3002),
  STELLAR_NETWORK_PASSPHRASE: z
    .string()
    .default(Networks.TESTNET),
  STELLAR_HORIZON_URL: z
    .string()
    .url()
    .default("https://horizon-testnet.stellar.org")
});

const env = envSchema.parse(process.env);

const app = express();

app.get("/health", (_request: Request, response: Response) => {
  const payload: StellarHealthResponse = {
    service: "stellar-service",
    status: "ok",
    networkPassphrase: env.STELLAR_NETWORK_PASSPHRASE,
    horizonUrl: env.STELLAR_HORIZON_URL,
    timestamp: new Date().toISOString()
  };

  response.json(payload);
});

app.get("/network", (_request: Request, response: Response) => {
  response.json({
    name: "TheMixMatch Stellar service starter",
    scope: "Network access, wallet utilities, and future signing workflows."
  });
});

app.listen(env.STELLAR_SERVICE_PORT, () => {
  console.log(
    `stellar-service listening on http://localhost:${env.STELLAR_SERVICE_PORT}`
  );
});
