import { z } from 'zod';

/** Soroban contract ids are 56-character strkeys starting with "C". */
const contractIdSchema = z
  .string({ required_error: 'Contract id is required' })
  .trim()
  .length(56, 'Contract ids must be 56 characters long')
  .regex(/^C[A-Z2-7]+$/, 'Enter a valid Soroban contract id');

const stellarPublicKeySchema = z
  .string({ required_error: 'Payee address is required' })
  .trim()
  .length(56, 'Stellar addresses must be 56 characters long')
  .regex(/^G[A-Z2-7]+$/, 'Enter a valid Stellar address');

/** Token amounts are the smallest-unit integer (e.g. stroops for XLM) the contract's i128 expects. */
const tokenAmountSchema = z
  .string({ required_error: 'Amount is required' })
  .trim()
  .regex(/^\d+$/, 'Amount must be a positive integer in the token\'s smallest unit')
  .refine((value) => /^\d+$/.test(value) && BigInt(value) > 0n, 'Amount must be greater than zero');

export const depositEscrowSchema = z.object({
  payeePublicKey: stellarPublicKeySchema,
  tokenContractId: contractIdSchema,
  amount: tokenAmountSchema,
  /** How many ledgers from now until the escrow becomes refundable by anyone. */
  timeoutLedgers: z
    .number({ required_error: 'timeoutLedgers is required' })
    .int()
    .positive()
    .max(10_000_000, 'timeoutLedgers is unreasonably large'),
  idempotencyKey: z.string().trim().min(1).optional(),
});

export type DepositEscrowInput = z.infer<typeof depositEscrowSchema>;
