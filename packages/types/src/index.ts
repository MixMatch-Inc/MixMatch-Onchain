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

export interface StarterRoadmapCard {
  title: string;
  body: string;
}
