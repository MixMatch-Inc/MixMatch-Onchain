/**
 * Test Harness Context Configuration Scope
 * Defines the concrete execution parameters for setting up an isolated E2E runtime.
 */
export interface HarnessConfig {
  /** Enables or disables the explicit database truncation cycle between test cases */
  autoClearDatabase: boolean;
  /** Force-flushes all stored Redis cache keys, including live sessions and rate-limit indices */
  autoClearRedis: boolean;
  /** String token used to authenticate mock actions on the pipeline runner */
  fallbackJwtSecret: string;
}

/**
 * Pre-Authenticated Mock Identity Payload
 * Explicitly mirrors the current 'auth-first' platform user schema.
 */
export interface AuthenticatedUserPayload {
  /** Unique database identifier of the target user */
  id: string;
  /** Primary identifier email string */
  email: string;
  /** System validation role (e.g., 'USER', 'MENTOR', 'ADMIN') */
  role: 'USER' | 'MENTOR' | 'ADMIN';
}

/**
 * Database Isolation Subsystem Interface Contract
 */
export interface IDbTestUtils {
  /**
   * Accepts an active database source connection and performs a cascading truncation.
   * Input: Initialized connection string or Connection Source Object.
   * Output: Promise<void> — guaranteeing clean state on completion.
   */
  clearDatabase(dataSource: any): Promise<void>;
  
  /**
   * Accepts an active cache instance client and purges all live memory segments.
   */
  clearRedis(redisClient: any): Promise<void>;
}

/**
 * Application Lifecycle & Request Agent Factory Contract
 */
export interface ITestHarness {
  /** Active reference to the initialized application runtime instance */
  app: any;
  /** Pre-configured database driver reference */
  dataSource: any;
  /** Pre-configured key-value memory store reference */
  redisClient: any;

  /**
   * Bootstraps the application framework, overrides heavy blockchain verifiers, and opens listener sockets.
   */
  initialize(config: HarnessConfig): Promise<void>;

  /**
   * Generates a pre-authenticated HTTP supertest agent context using signature shims.
   * Input: AuthenticatedUserPayload
   * Output: Supertest request agent pre-loaded with 'Authorization: Bearer <token>'
   */
  createAuthenticatedAgent(user: AuthenticatedUserPayload): any;

  /**
   * Safely terminates open connections, database sockets, and server hooks.
   */
  close(): Promise<void>;
}