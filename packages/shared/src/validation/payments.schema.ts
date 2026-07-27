import { z } from 'zod';

// Stellar ed25519 public keys ("account IDs"): 'G' + 55 base32 characters.
const STELLAR_PUBLIC_KEY_PATTERN = /^G[A-Z2-7]{55}$/;

// Decimal amount, up to 7 fractional digits (Stellar's native asset precision), strictly positive.
const AMOUNT_PATTERN = /^\d+(\.\d{1,7})?$/;

const MEMO_MAX_LENGTH = 28;
const IDEMPOTENCY_KEY_MAX_LENGTH = 255;

/**
 * Send-payment payload schema — shared between `apps/api` (server-side
 * validation) and `apps/web` (client-side validation before submit), so
 * both sides agree on exactly what a valid payment request looks like.
 */
export const sendPaymentSchema = z
  .object({
    destinationPublicKey: z
      .string({ required_error: 'Recipient address is required' })
      .regex(STELLAR_PUBLIC_KEY_PATTERN, 'Enter a valid Stellar public key'),
    amount: z
      .string({ required_error: 'Amount is required' })
      .regex(AMOUNT_PATTERN, 'Enter a positive amount with up to 7 decimal places')
      .refine((value) => Number(value) > 0, 'Amount must be greater than zero'),
    memo: z.string().max(MEMO_MAX_LENGTH, `Memo must be at most ${MEMO_MAX_LENGTH} characters`).optional(),
    idempotencyKey: z.string().min(1).max(IDEMPOTENCY_KEY_MAX_LENGTH).optional(),
  })
  .strict('Payment payload contains unexpected fields');

export type SendPaymentSchema = z.infer<typeof sendPaymentSchema>;
