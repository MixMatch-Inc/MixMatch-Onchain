export interface TokenPersistenceConfig {
  refreshTokenExpiryMs: number;
  maxActiveSessions: number;
  cleanupIntervalMs?: number;
}
