export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogContext = Record<string, unknown>;

export interface LoggerOptions {
  serviceName: string;
  level?: LogLevel;
  environment?: string;
  baseContext?: LogContext;
  redactPatterns?: RegExp[];
}

export interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
  child(context: LogContext): Logger;
}

const DEFAULT_LEVEL: LogLevel = 'info';

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const DEFAULT_REDACT_PATTERNS = [
  /authorization/i,
  /cookie/i,
  /key/i,
  /pass(word)?/i,
  /secret/i,
  /token/i,
];

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value) &&
  !(value instanceof Date) &&
  !(value instanceof Error);

const normalizeLevel = (level?: string): LogLevel => {
  const candidate = level?.toLowerCase();
  if (candidate === 'debug' || candidate === 'info' || candidate === 'warn' || candidate === 'error') {
    return candidate;
  }
  return DEFAULT_LEVEL;
};

const shouldLog = (configuredLevel: LogLevel, messageLevel: LogLevel): boolean =>
  LEVEL_PRIORITY[messageLevel] >= LEVEL_PRIORITY[configuredLevel];

const isJsonEnvironment = (environment: string): boolean => {
  const normalized = environment.toLowerCase();
  return normalized !== 'development' && normalized !== 'local' && normalized !== 'test';
};

const redactValue = (
  value: unknown,
  patterns: RegExp[],
  seen: WeakSet<object> = new WeakSet(),
): unknown => {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((entry) => redactValue(entry, patterns, seen));
  }

  if (isPlainObject(value)) {
    if (seen.has(value)) {
      return '[Circular]';
    }

    seen.add(value);

    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => {
        const shouldRedact = patterns.some((pattern) => pattern.test(key));
        return [
          key,
          shouldRedact ? '[REDACTED]' : redactValue(nestedValue, patterns, seen),
        ];
      }),
    );
  }

  return value;
};

const formatPrettyRecord = (record: Record<string, unknown>): string => {
  const { timestamp, level, service, message, ...context } = record;
  const base = `[${timestamp}] ${String(level).toUpperCase()} ${String(service)} ${String(message)}`;
  const contextEntries = Object.keys(context).length > 0 ? ` ${JSON.stringify(context)}` : '';
  return `${base}${contextEntries}`;
};

const writeRecord = (level: LogLevel, message: string): void => {
  if (level === 'error') {
    console.error(message);
    return;
  }

  if (level === 'warn') {
    console.warn(message);
    return;
  }

  console.log(message);
};

const createLoggerInstance = (
  options: Required<Pick<LoggerOptions, 'serviceName' | 'environment' | 'redactPatterns'>> & {
    level: LogLevel;
    baseContext: LogContext;
  },
): Logger => {
  const emit = (level: LogLevel, message: string, context: LogContext = {}): void => {
    if (!shouldLog(options.level, level)) {
      return;
    }

    const payload = redactValue(
      {
        timestamp: new Date().toISOString(),
        level,
        service: options.serviceName,
        message,
        ...options.baseContext,
        ...context,
      },
      options.redactPatterns,
    ) as Record<string, unknown>;

    const formatted = isJsonEnvironment(options.environment)
      ? JSON.stringify(payload)
      : formatPrettyRecord(payload);

    writeRecord(level, formatted);
  };

  return {
    debug: (message, context) => emit('debug', message, context),
    info: (message, context) => emit('info', message, context),
    warn: (message, context) => emit('warn', message, context),
    error: (message, context) => emit('error', message, context),
    child: (context) =>
      createLoggerInstance({
        ...options,
        baseContext: {
          ...options.baseContext,
          ...context,
        },
      }),
  };
};

export const createLogger = (options: LoggerOptions): Logger => {
  return createLoggerInstance({
    serviceName: options.serviceName,
    level: normalizeLevel(options.level),
    environment: options.environment ?? process.env.NODE_ENV ?? 'development',
    redactPatterns: options.redactPatterns ?? DEFAULT_REDACT_PATTERNS,
    baseContext: options.baseContext ?? {},
  });
};
