export interface ApiHealthResponse {
  service: "api";
  status: "ok";
  timestamp: string;
  version: string;
}

export interface StellarHealthResponse {
  service: "stellar-service";
  status: "ok";
  networkPassphrase: string;
  horizonUrl: string;
  timestamp: string;
}

export interface StellarServiceHandshake {
  service: "stellar-service";
  status: "ok";
  supportedWallets: string[];
  networkPassphrase: string;
  horizonUrl: string;
  timestamp: string;
}

export interface StarterRoadmapCard {
  title: string;
  body: string;
}

export * from "./auth.js";
export * from "./auth-envelope.types.js";
export * from "./auth-errors.types.js";
