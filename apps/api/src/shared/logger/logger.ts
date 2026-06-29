import { IAppLogger, LogContext, LogLevel } from '../../common/logger/logger.interface';

/**
 * Structured logger that implements the IAppLogger interface, adhering to the auth-first foundation.
 * Requires all log entries to include module context, and supports userId/correlationId for traceability.
 */
export const logger: IAppLogger = {
  debug: (message: string, context: LogContext): void => {
    if (process.env.NODE_ENV !== 'production') {
      const formattedContext = formatContext(context);
      console.debug(JSON.stringify({ level: LogLevel.DEBUG, message, ...formattedContext }));
    }
  },
  info: (message: string, context: LogContext): void => {
    const formattedContext = formatContext(context);
    console.log(JSON.stringify({ level: LogLevel.INFO, message, ...formattedContext }));
  },
  warn: (message: string, context: LogContext): void => {
    const formattedContext = formatContext(context);
    console.warn(JSON.stringify({ level: LogLevel.WARN, message, ...formattedContext }));
  },
  error: (message: string, error: Error | string, context: LogContext): void => {
    const formattedError = typeof error === 'string' 
      ? { message: error } 
      : { 
          message: error.message, 
          stack: error.stack,
          name: error.name 
        };
    const formattedContext = formatContext(context);
    console.error(JSON.stringify({ 
      level: LogLevel.ERROR, 
      message, 
      error: formattedError,
      ...formattedContext 
    }));
  },
};

/**
 * Formats log context to ensure auth-first metadata is properly propagated
 */
function formatContext(context: LogContext): Record<string, unknown> {
  const { userId, correlationId, module, ...rest } = context;
  
  return {
    module,
    ...(userId && { userId }),
    ...(correlationId && { correlationId }),
    ...rest
  };
}