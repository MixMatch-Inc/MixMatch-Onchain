import { z } from "zod";
import type { StellarServiceHandshake, WalletBootstrap } from "@themixmatch/types";

const envSchema = z.object({
  STELLAR_SERVICE_URL: z.string().url().default("http://localhost:3002"),
});

const env = envSchema.parse(process.env);

const handshakeSchema = z.object({
  service: z.literal("stellar-service"),
  status: z.literal("ok"),
  supportedWallets: z.string().array(),
  networkPassphrase: z.string(),
  horizonUrl: z.string().url(),
  timestamp: z.string(),
});

export async function getStellarHandshake(): Promise<StellarServiceHandshake> {
  const url = `${env.STELLAR_SERVICE_URL.replace(/\/$/, "")}/handshake`;
  const response = await fetch(url, { method: "GET" });

  if (!response.ok) {
    throw new Error(`Stellar handshake request failed with status ${response.status}`);
  }

  const body = await response.json();
  return handshakeSchema.parse(body);
}

export function mapHandshakeToWalletBootstrap(handshake: StellarServiceHandshake): WalletBootstrap {
  return {
    service: "stellar-service",
    status: "unlinked",
    networkPassphrase: handshake.networkPassphrase,
    horizonUrl: handshake.horizonUrl,
    availableWallets: handshake.supportedWallets,
  };
}

export function defaultWalletBootstrap(): WalletBootstrap {
  return {
    service: "stellar-service",
    status: "unlinked",
    networkPassphrase: process.env.STELLAR_NETWORK_PASSPHRASE || "Test SDF Network ; September 2015",
    horizonUrl: process.env.STELLAR_HORIZON_URL || "https://horizon-testnet.stellar.org",
    availableWallets: ["phantom", "freighter"],
  };
}
