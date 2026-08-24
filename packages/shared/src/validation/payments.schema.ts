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

/** Slippage tolerance in basis points (1 bps = 0.01%); 0-1000 covers 0%-10%, which is generous for a normal path payment. */
const slippageBpsSchema = z.number().int().min(0).max(1000);

export const sendPaymentSchema = z
  .object({
    destinationPublicKey: stellarPublicKeySchema,
    /**
     * For a plain payment, or a `pathMode: 'strictSend'` path payment
     * (default when `receiveAssetCode` is set): the exact amount sent.
     * For `pathMode: 'strictReceive'`: the exact amount the recipient
     * should receive, in `receiveAssetCode`/`receiveAssetIssuer`.
     */
    amount: amountSchema,
    memo: z.string().trim().max(28, 'Memo must not exceed 28 characters').optional(),
    idempotencyKey: z.string().trim().min(1).optional(),
    /** Omit both `assetCode`/`assetIssuer` to send native XLM; provide both together to send a custom asset. */
    assetCode: assetCodeSchema.optional(),
    assetIssuer: stellarPublicKeySchema.optional(),
    /**
     * Omit for a plain payment (recipient gets the same asset that was
     * sent). Provide both `receiveAssetCode`/`receiveAssetIssuer` together
     * to send a path payment, where the recipient receives a *different*
     * asset than `assetCode`/`assetIssuer` (native XLM if both omitted),
     * routed through Stellar's DEX.
     */
    receiveAssetCode: assetCodeSchema.optional(),
    receiveAssetIssuer: stellarPublicKeySchema.optional(),
    /** Only meaningful for a path payment; defaults to 'strictSend'. */
    pathMode: z.enum(['strictSend', 'strictReceive']).optional(),
    /** Only meaningful for a path payment; defaults to 50 (0.5%) if omitted. */
    slippageBps: slippageBpsSchema.optional(),
  })
  .refine((input) => Boolean(input.assetCode) === Boolean(input.assetIssuer), {
    message: 'assetCode and assetIssuer must be provided together, or both omitted for native XLM',
    path: ['assetCode'],
  })
  .refine((input) => Boolean(input.receiveAssetCode) === Boolean(input.receiveAssetIssuer), {
    message: 'receiveAssetCode and receiveAssetIssuer must be provided together, or both omitted',
    path: ['receiveAssetCode'],
  });

export type SendPaymentInput = z.infer<typeof sendPaymentSchema>;

const pathAssetSchema = z.object({
  assetCode: assetCodeSchema.optional(),
  assetIssuer: stellarPublicKeySchema.optional(),
}).refine((input) => Boolean(input.assetCode) === Boolean(input.assetIssuer), {
  message: 'assetCode and assetIssuer must be provided together, or both omitted for native XLM',
  path: ['assetCode'],
});

export const pathQuoteSchema = z.object({
  source: pathAssetSchema,
  dest: pathAssetSchema,
  /** Exact source amount (strictSend) or exact destination amount (strictReceive). */
  amount: amountSchema,
  mode: z.enum(['strictSend', 'strictReceive']),
});

export type PathQuoteInput = z.infer<typeof pathQuoteSchema>;

export const establishTrustlineSchema = z.object({
  assetCode: assetCodeSchema,
  assetIssuer: stellarPublicKeySchema,
  /** Max amount of the asset to hold. Omit for the protocol maximum. */
  limit: amountSchema.optional(),
});

export type EstablishTrustlineInput = z.infer<typeof establishTrustlineSchema>;
