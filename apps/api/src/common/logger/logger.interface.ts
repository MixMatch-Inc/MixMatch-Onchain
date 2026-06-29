/**
 * Strict enumeration of allowed application log severity levels.
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

/**
 * Standard structured logging payload matrix.
 * Reflects the current auth-first architecture, requiring security context metadata.
 */
export interface LogContext {
  userId?: string;       // Traceability for authenticated operations
  correlationId?: string;// Unique request identifier passed through middleware
  module: string;        // Component/Domain boundary name (e.g., "auth", "billing")
  [key: string]: any;    // Extensible properties for supplementary diagnostic variables
}

/**
 * Task Requirement: Lock the boundary contract.
 * Every logging transport module must adhere strictly to this definition framework.
 */
export interface IAppLogger {
  /**
   * Logs system telemetry, health indicators, or successful operational milestones.
   */
  info(message: string, context: LogContext): void;

  /**
   * Logs transient structural irregularities or non-fatal execution failures.
   */
  warn(message: string, context: LogContext): void;

  /**
   * Captures fatal exceptions, database rollbacks, or critical authentication breaches.
   */
  error(message: string, error: Error | string, context: LogContext): void;

  /**
   * Verbose debug footprints; automatically silenced in production environments.
   */
  debug?(message: string, context: LogContext): void;
}