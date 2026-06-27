/**
 * Minimal structured logger. Kept intentionally small for the hackathon
 * foundation.
 * 
 * To swap for a richer logger (e.g., pino, winston):
 * 1. Install the library (e.g., `pnpm add pino`)
 * 2. Export its instance here, mapping its methods to this interface.
 * 3. All adjacent systems using this `logger` export will automatically upgrade.
 */

const formatMeta = (meta?: Record<string, unknown>) => {
  if (!meta) return undefined;
  
  if (meta.error instanceof Error) {
    return {
      ...meta,
      error: {
        message: meta.error.message,
        stack: meta.error.stack,
        name: meta.error.name,
      }
    };
  }
  return meta;
};

export const logger = {
  debug: (message: string, meta?: Record<string, unknown>): void => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(JSON.stringify({ level: 'debug', message, ...formatMeta(meta) }));
    }
  },
  info: (message: string, meta?: Record<string, unknown>): void => {
    console.log(JSON.stringify({ level: 'info', message, ...formatMeta(meta) }));
  },
  warn: (message: string, meta?: Record<string, unknown>): void => {
    console.warn(JSON.stringify({ level: 'warn', message, ...formatMeta(meta) }));
  },
  error: (message: string, meta?: Record<string, unknown>): void => {
    console.error(JSON.stringify({ level: 'error', message, ...formatMeta(meta) }));
  },
};
