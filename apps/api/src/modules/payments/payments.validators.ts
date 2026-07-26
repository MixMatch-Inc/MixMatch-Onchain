import { z } from 'zod';
import { ValidationError } from '../../shared/errors/AppError.js';
import type { SendPaymentDto } from './payments.types.js';

// Stellar ed25519 public keys ("account IDs"): 'G' + 55 base32 characters.
const STELLAR_PUBLIC_KEY_PATTERN = /^G[A-Z2-7]{55}$/;

// Decimal amount, up to 7 fractional digits (Stellar's native asset precision), strictly positive.
const AMOUNT_PATTERN = /^\d+(\.\d{1,7})?$/;

const sendPaymentSchema = z.object({
  destinationPublicKey: z
    .string()
    .regex(STELLAR_PUBLIC_KEY_PATTERN, 'destinationPublicKey must be a valid Stellar public key'),
  amount: z
    .string()
    .regex(AMOUNT_PATTERN, 'amount must be a positive decimal string with up to 7 decimal places')
    .refine((value) => Number(value) > 0, 'amount must be greater than zero'),
  memo: z.string().max(28, 'memo must be at most 28 characters').optional(),
  idempotencyKey: z.string().min(1).max(255).optional(),
});

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
