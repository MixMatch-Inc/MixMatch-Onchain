import { z } from 'zod';

/** Stellar public keys (account IDs) are 56-character base32 strings starting with "G". */
const stellarPublicKeySchema = z
  .string({ required_error: 'Destination address is required' })
  .trim()
  .length(56, 'Stellar addresses must be 56 characters long')
  .regex(/^G[A-Z2-7]+$/, 'Enter a valid Stellar address');

/** Native XLM amounts are decimal strings with up to 7 fractional digits (Stellar's precision). */
const amountSchema = z
  .string({ required_error: 'Amount is required' })
  .trim()
  .regex(/^\d+(\.\d{1,7})?$/, 'Amount must be a positive number with up to 7 decimal places')
  .refine((value) => Number(value) > 0, 'Amount must be greater than zero');

/** Stellar asset codes are 1-12 alphanumeric characters (the standard 4- or 12-char asset code formats). */
const assetCodeSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9]{1,12}$/, 'Asset code must be 1-12 alphanumeric characters');

export const sendPaymentSchema = z
  .object({
    destinationPublicKey: stellarPublicKeySchema,
    amount: amountSchema,
    memo: z.string().trim().max(28, 'Memo must not exceed 28 characters').optional(),
    idempotencyKey: z.string().trim().min(1).optional(),
    /** Omit both `assetCode`/`assetIssuer` to send native XLM; provide both together to send a custom asset. */
    assetCode: assetCodeSchema.optional(),
    assetIssuer: stellarPublicKeySchema.optional(),
  })
  .refine((input) => Boolean(input.assetCode) === Boolean(input.assetIssuer), {
    message: 'assetCode and assetIssuer must be provided together, or both omitted for native XLM',
    path: ['assetCode'],
  });

export type SendPaymentInput = z.infer<typeof sendPaymentSchema>;

export const establishTrustlineSchema = z.object({
  assetCode: assetCodeSchema,
  assetIssuer: stellarPublicKeySchema,
  /** Max amount of the asset to hold. Omit for the protocol maximum. */
  limit: amountSchema.optional(),
});

export type EstablishTrustlineInput = z.infer<typeof establishTrustlineSchema>;
