import { z } from 'zod';
import { AvailabilityStatus, DjGenre } from '@mixmatch/types';

export const djDiscoveryQuerySchema = z.object({
  q: z.string().trim().optional(),
  genre: z.enum(Object.values(DjGenre) as [DjGenre, ...DjGenre[]]).optional(),
  availabilityStatus: z
    .enum(
      Object.values(AvailabilityStatus) as [
        AvailabilityStatus,
        ...AvailabilityStatus[],
      ],
    )
    .optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
});
