import { IAppLogger, LogContext, LogLevel } from '../../common/logger/logger.interface.js';

const MAX_MESSAGE_LENGTH = 10_000;

const LOG_LEVEL_ORDER: Record<LogLevel, number> = {
  [LogLevel.DEBUG]: 0,
  [LogLevel.INFO]: 1,
  [LogLevel.WARN]: 2,
  [LogLevel.ERROR]: 3,
};

let minLevel: LogLevel = LogLevel.DEBUG;

export function setLogLevel(level: LogLevel): void {
  minLevel = level;
}

export function getLogLevel(): LogLevel {
  return minLevel;
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVEL_ORDER[level] >= LOG_LEVEL_ORDER[minLevel];
}

function truncateMessage(message: string): string {
  if (message.length <= MAX_MESSAGE_LENGTH) return message;
  return message.slice(0, MAX_MESSAGE_LENGTH) + '...[truncated]';
}

export const logger: IAppLogger = {
  debug: (message: string, context: LogContext): void => {
    if (process.env.NODE_ENV !== 'production' && shouldLog(LogLevel.DEBUG)) {
      const formattedContext = formatContext(context);
      console.debug(JSON.stringify({ level: LogLevel.DEBUG, message: truncateMessage(message), ...formattedContext }));
    }
  },
  info: (message: string, context: LogContext): void => {
    if (!shouldLog(LogLevel.INFO)) return;
    const formattedContext = formatContext(context);
    console.log(JSON.stringify({ level: LogLevel.INFO, message: truncateMessage(message), ...formattedContext }));
  },
  warn: (message: string, context: LogContext): void => {
    if (!shouldLog(LogLevel.WARN)) return;
    const formattedContext = formatContext(context);
    console.warn(JSON.stringify({ level: LogLevel.WARN, message: truncateMessage(message), ...formattedContext }));
  },
  error: (message: string, error: Error | string, context: LogContext): void => {
    if (!shouldLog(LogLevel.ERROR)) return;
    const formattedError = typeof error === 'string'
      ? { message: error }
      : {
          message: error.message ?? 'Unknown error',
          stack: error.stack ?? undefined,
          name: error.name ?? 'Error',
        };
    const formattedContext = formatContext(context);
    console.error(JSON.stringify({
      level: LogLevel.ERROR,
      message: truncateMessage(message),
      error: formattedError,
      ...formattedContext
    }));
  },
};

export function createChildLogger(moduleName: string, baseContext?: Partial<LogContext>): IAppLogger {
  return {
    info: (message: string, context: LogContext): void => {
      logger.info(message, { ...baseContext, ...context, module: moduleName });
    },
    warn: (message: string, context: LogContext): void => {
      logger.warn(message, { ...baseContext, ...context, module: moduleName });
    },
    error: (message: string, error: Error | string, context: LogContext): void => {
      logger.error(message, error, { ...baseContext, ...context, module: moduleName });
    },
    debug: (message: string, context: LogContext): void => {
      logger.debug?.(message, { ...baseContext, ...context, module: moduleName });
    },
  };
}

export function formatContext(context: LogContext): Record<string, unknown> {
  if (context == null) return { module: 'unknown' };
  const { userId, correlationId, module, ...rest } = context;
  return {
    module: module ?? 'unknown',
    ...(userId != null && { userId }),
    ...(correlationId != null && { correlationId }),
    ...rest
  };
}
