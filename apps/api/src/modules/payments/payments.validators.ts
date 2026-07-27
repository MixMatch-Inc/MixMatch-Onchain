import { sendPaymentSchema } from '@mixmatch/shared';
import { ValidationError } from '../../shared/errors/AppError.js';
import type { SendPaymentDto } from './payments.types.js';

export function parseSendPaymentInput(input: unknown): SendPaymentDto {
  const result = sendPaymentSchema.safeParse(input);
  if (!result.success) {
    throw new ValidationError(result.error.issues[0]?.message ?? 'Invalid payment request');
  }
  return result.data;
}

export interface HistoryQuery {
  page: number;
  limit: number;
}

const MAX_HISTORY_LIMIT = 100;
const DEFAULT_HISTORY_LIMIT = 20;

export function parseHistoryQuery(query: Record<string, unknown>): HistoryQuery {
  const page = parsePositiveInt(query.page, 1);
  const limit = Math.min(parsePositiveInt(query.limit, DEFAULT_HISTORY_LIMIT), MAX_HISTORY_LIMIT);
  return { page, limit };
}

function parsePositiveInt(raw: unknown, fallback: number): number {
  if (raw === undefined) return fallback;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new ValidationError('page and limit must be positive integers');
  }
  return parsed;
}
