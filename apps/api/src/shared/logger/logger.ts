/**
 * Minimal structured logger. Kept intentionally small for the hackathon
 * foundation; swap for a richer logger (pino, winston, etc.) as needed.
 */
export const logger = {
  info: (message: string, meta?: Record<string, unknown>): void => {
    console.log(JSON.stringify({ level: 'info', message, ...meta }));
  },
  error: (message: string, meta?: Record<string, unknown>): void => {
    console.error(JSON.stringify({ level: 'error', message, ...meta }));
  },
};
