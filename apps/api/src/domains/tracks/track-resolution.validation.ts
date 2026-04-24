import { z } from 'zod';
import { ProviderType } from '@mixmatch/types';

export const resolveTrackReferenceBodySchema = z.object({
  provider: z.nativeEnum(ProviderType),
  providerTrackId: z.string().min(1).max(255),
  /** Optional raw payload – required only when no canonical record exists yet */
  rawPayload: z.record(z.unknown()).optional(),
});

export const resolveTrackReferenceQuerySchema = z.object({
  platform: z.enum(['web', 'mobile']).optional().default('web'),
  market: z.string().length(2).optional(),
});
