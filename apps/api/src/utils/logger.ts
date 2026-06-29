/**
 * Re-export of the core structured logger that implements the IAppLogger interface.
 * Adheres to the auth-first foundation and maintains consistent logging across the application.
 * 
 * To swap for a richer logger (e.g., pino, winston):
 * 1. Install the library (e.g., `pnpm add pino`)
 * 2. Update the implementation in ../shared/logger/logger.ts
 * 3. All systems using this logger export will automatically upgrade.
 */
export { logger } from '../shared/logger/logger.js';