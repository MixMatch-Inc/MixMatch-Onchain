import { z } from 'zod';
import { StellarNetwork, KeyProvenance, WalletLinkageStatus, FeatureEligibility } from '@mixmatch/types';

export const createWalletLinkageSchema = z.object({
  stellarAccountId: z
    .string()
    .regex(/^G[A-Z0-9]{55}$/, 'Invalid Stellar account ID format'),
  network: z.nativeEnum(StellarNetwork, {
    error: () => ({ message: 'Invalid Stellar network' }),
  }),
  keyProvenance: z.nativeEnum(KeyProvenance, {
    error: () => ({ message: 'Invalid key provenance' }),
  }),
  verificationSignature: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const verifyWalletLinkageSchema = z.object({
  verificationSignature: z
    .string()
    .min(1, 'Verification signature is required'),
});

export const updateWalletLinkageSchema = z.object({
  status: z.nativeEnum(WalletLinkageStatus).optional(),
  featureEligibility: z.array(z.nativeEnum(FeatureEligibility)).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const getWalletLinkagesQuerySchema = z.object({
  status: z.nativeEnum(WalletLinkageStatus).optional(),
  network: z.nativeEnum(StellarNetwork).optional(),
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
});

export const getWalletHistoryQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(50),
});

export type CreateWalletLinkageInput = z.infer<typeof createWalletLinkageSchema>;
export type VerifyWalletLinkageInput = z.infer<typeof verifyWalletLinkageSchema>;
export type UpdateWalletLinkageInput = z.infer<typeof updateWalletLinkageSchema>;
export type GetWalletLinkagesQuery = z.infer<typeof getWalletLinkagesQuerySchema>;
export type GetWalletHistoryQuery = z.infer<typeof getWalletHistoryQuerySchema>;
