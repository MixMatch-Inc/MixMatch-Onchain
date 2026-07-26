import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

export class RepositoryError extends Error {
  public readonly code: string;
  public readonly cause?: Error;

  constructor(message: string, code: string, cause?: Error) {
    super(message);
    this.name = 'RepositoryError';
    this.code = code;
    this.cause = cause;
  }
}

export function isTransientError(error: unknown): boolean {
  if (error instanceof PrismaClientKnownRequestError) {
    return ['P1000', 'P1001', 'P1002', 'P1008', 'P1017'].includes(error.code);
  }
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes('connection') ||
      msg.includes('timeout') ||
      msg.includes('timedout') ||
      msg.includes('econnreset') ||
      msg.includes('econnrefused')
    );
  }
  return false;
}

export function wrapPrismaError(error: unknown): never {
  if (error instanceof PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        throw new RepositoryError('Unique constraint violation', 'DUPLICATE', error);
      case 'P2025':
        throw new RepositoryError('Record not found', 'NOT_FOUND', error);
      case 'P2003':
        throw new RepositoryError('Foreign key constraint failed', 'FOREIGN_KEY', error);
      default:
        throw new RepositoryError(
          `Database error: ${error.code}`,
          'DATABASE_ERROR',
          error,
        );
    }
  }
  if (error instanceof Error) {
    throw new RepositoryError(error.message, 'DATABASE_ERROR', error);
  }
  throw new RepositoryError('Unknown database error', 'DATABASE_ERROR');
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 2,
  delayMs = 100,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries && isTransientError(error)) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * (attempt + 1)));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

export function validateRequired(fields: Record<string, unknown>): void {
  for (const [field, value] of Object.entries(fields)) {
    if (value === undefined || value === null || value === '') {
      throw new RepositoryError(
        `Missing required field: ${field}`,
        'VALIDATION_ERROR',
      );
    }
  }
}

export function validateId(id: string): void {
  if (!id || typeof id !== 'string' || id.trim().length === 0) {
    throw new RepositoryError('Invalid id', 'VALIDATION_ERROR');
  }
}
