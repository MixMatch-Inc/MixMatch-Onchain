import { z } from 'zod';

/** Stellar asset codes are 1-12 alphanumeric characters (the standard 4- or 12-char asset code formats). */
const assetCodeSchema = z
  .string({ required_error: 'Asset code is required' })
  .trim()
  .regex(/^[A-Za-z0-9]{1,12}$/, 'Asset code must be 1-12 alphanumeric characters');

const amountSchema = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,7})?$/, 'Amount must be a positive number with up to 7 decimal places')
  .refine((value) => Number(value) > 0, 'Amount must be greater than zero')
  .optional();

export const depositAnchorSchema = z.object({
  assetCode: assetCodeSchema,
  /** Omit to let the anchor's interactive flow ask the user for an amount. */
  amount: amountSchema,
});

export type DepositAnchorInput = z.infer<typeof depositAnchorSchema>;

export const withdrawAnchorSchema = z.object({
  assetCode: assetCodeSchema,
  /** Omit to let the anchor's interactive flow ask the user for an amount. */
  amount: amountSchema,
});

export type WithdrawAnchorInput = z.infer<typeof withdrawAnchorSchema>;
