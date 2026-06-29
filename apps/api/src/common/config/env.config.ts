/**
 * Strongly-typed representation of core environment primitives.
 */
export interface EnvironmentVariables {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  JWT_SECRET: string;
  STELLAR_NETWORK: 'public' | 'testnet';
  RPC_URL: string;
}

export class EnvConfig {
  private static instance: EnvironmentVariables;

  /**
   * Initializes and validates environment inputs.
   * Throws an explicit error instantly if any crucial criteria are unmet.
   */
  public static load(): EnvironmentVariables {
    if (this.instance) return this.instance;

    const env = process.env;

    // 1. Enforce strict configuration rules for the auth-first matrix
    if (!env.JWT_SECRET || env.JWT_SECRET.trim().length < 32) {
      throw new Error(
        'CRITICAL CONFIGURATION ERROR: JWT_SECRET is missing or structurally insecure (must be at least 32 characters).'
      );
    }

    if (!env.RPC_URL) {
      throw new Error('CRITICAL CONFIGURATION ERROR: Stella/Soroban RPC_URL target must be explicitly provided.');
    }

    // 2. Build the sanitized, type-casted runtime layout object slice
    this.instance = {
      NODE_ENV: (env.NODE_ENV as any) || 'development',
      PORT: parseInt(env.PORT || '3000', 10),
      JWT_SECRET: env.JWT_SECRET,
      STELLAR_NETWORK: (env.STELLAR_NETWORK as any) || 'testnet',
      RPC_URL: env.RPC_URL,
    };

    return this.instance;
  }

  /**
   * Explicitly drops the active configuration cache. Used primarily inside test suites.
   */
  public static clear(): void {
    (this.instance as any) = null;
  }
}