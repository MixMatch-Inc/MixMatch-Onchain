/**
 * Minimal structured logger. Kept intentionally small for the hackathon
 * foundation.
 * 
 * To swap for a richer logger (e.g., pino, winston):
 * 1. Install the library (e.g., `pnpm add pino`)
 * 2. Export its instance here, mapping its methods to this interface.
 * 3. All adjacent systems using this `logger` export will automatically upgrade.
 */

const safeStringify = (obj: unknown): string => {
  try {
    if (obj === undefined || obj === null) {
      return 'null';
    }
    return JSON.stringify(obj);
  } catch (error) {
    // Handle circular references or other stringification failures
    return `[Unstringifiable Object: ${typeof obj}]`;
  }
};

const formatMeta = (meta?: Record<string, unknown>) => {
  if (!meta) return {};
  
  const processedMeta = { ...meta };
  if (processedMeta.error instanceof Error) {
    processedMeta.error = {
      message: processedMeta.error.message,
      stack: processedMeta.error.stack,
      name: processedMeta.error.name,
    };
  }
  // Ensure we never pass undefined values that could break logging
  Object.keys(processedMeta).forEach(key => {
    if (processedMeta[key] === undefined) {
      processedMeta[key] = null;
    }
  });
  return processedMeta;
};

// Retry configuration for failed log writes (console failures are rare but possible)
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 100;

const withRetry = (
  logFn: (...args: unknown[]) => void,
  level: string,
  message: string,
  meta?: Record<string, unknown>,
  attempt: number = 0
): void => {
  try {
    const processedMeta = formatMeta(meta);
    const logEntry = {
      level,
      timestamp: new Date().toISOString(),
      message,
      ...processedMeta,
    };
    logFn(safeStringify(logEntry));
  } catch (error) {
    if (attempt < MAX_RETRIES) {
      setTimeout(() => {
        withRetry(logFn, level, message, meta, attempt + 1);
      }, RETRY_DELAY_MS * (attempt + 1)); // Exponential backoff
    } else {
      // Last resort fallback to ensure we never drop logs entirely
      try {
        console.error(`FALLBACK LOG [${level}]: ${message} | Original log failed after ${MAX_RETRIES} retries`, error);
      } catch {
        // Intentionally empty - absolute last safeguard to prevent app crashes
      }
    }
  }
};

export const logger = {
  debug: (message: string, meta?: Record<string, unknown>): void => {
    // Validate required message parameter (empty state handling)
    if (!message || typeof message !== 'string') {
      withRetry(console.debug, 'debug', 'Invalid debug message provided (empty or non-string)', { originalInput: message });
      return;
    }
    
    if (process.env.NODE_ENV !== 'production') {
      withRetry(console.debug, 'debug', message, meta);
    }
  },
  info: (message: string, meta?: Record<string, unknown>): void => {
    if (!message || typeof message !== 'string') {
      withRetry(console.log, 'info', 'Invalid info message provided (empty or non-string)', { originalInput: message });
      return;
    }
    withRetry(console.log, 'info', message, meta);
  },
  warn: (message: string, meta?: Record<string, unknown>): void => {
    if (!message || typeof message !== 'string') {
      withRetry(console.warn, 'warn', 'Invalid warn message provided (empty or non-string)', { originalInput: message });
      return;
    }
    withRetry(console.warn, 'warn', message, meta);
  },
  error: (message: string, meta?: Record<string, unknown>): void => {
    if (!message || typeof message !== 'string') {
      withRetry(console.error, 'error', 'Invalid error message provided (empty or non-string)', { originalInput: message });
      return;
    }
    withRetry(console.error, 'error', message, meta);
  },
};