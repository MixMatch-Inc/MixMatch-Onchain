import type { DjGenre, AvailabilityStatus, DjDiscoveryItemDto } from '@mixmatch/types';

export type DiscoveryMode = 'normal' | 'blind';

export interface DiscoveryFilters {
  q?: string;
  genre?: DjGenre;
  availabilityStatus?: AvailabilityStatus;
  minPrice?: number;
  maxPrice?: number;
  mode?: DiscoveryMode;
}

export interface DiscoveryPage {
  items: DjDiscoveryItemDto[];
  nextCursor: string | null;
  total: number;
}
