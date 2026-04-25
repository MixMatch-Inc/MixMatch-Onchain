import type { PaginatedResponseDto } from '@mixmatch/types';
import { apiRequest } from '@/lib/apiClient';
import { useSessionStore } from '@/store/session.store';
import type { DiscoveryFilters, DiscoveryPage } from './discovery.types';

const PAGE_SIZE = 20;

/** Decode an opaque cursor back to a page number (1-based). */
function decodeCursor(cursor: string | null): number {
  if (!cursor) return 1;
  try {
    return parseInt(cursor, 10) || 1;
  } catch {
    return 1;
  }
}

/** Encode a page number into an opaque cursor string. */
function encodeCursor(page: number): string {
  return String(page);
}

/**
 * Fetch one page of discovery results.
 *
 * @param cursor  Opaque cursor from the previous page (null = first page).
 * @param filters Surface / mode filters.
 * @param signal  AbortSignal — pass a new one on each rapid gesture to cancel stale requests.
 */
export async function fetchDiscoveryPage(
  cursor: string | null,
  filters: DiscoveryFilters,
  signal?: AbortSignal,
): Promise<DiscoveryPage> {
  const token = useSessionStore.getState().token;
  const page = decodeCursor(cursor);

  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(PAGE_SIZE),
  });

  if (filters.q) params.set('q', filters.q);
  if (filters.genre) params.set('genre', filters.genre);
  if (filters.availabilityStatus) params.set('availabilityStatus', filters.availabilityStatus);
  if (filters.minPrice !== undefined) params.set('minPrice', String(filters.minPrice));
  if (filters.maxPrice !== undefined) params.set('maxPrice', String(filters.maxPrice));
  // blind-mode flag — server can use this to strip identifying info
  if (filters.mode === 'blind') params.set('blind', '1');

  const data = await apiRequest<PaginatedResponseDto<ReturnType<typeof Object.create>>>(
    `/discovery/djs?${params.toString()}`,
    { token, signal },
  );

  const hasMore = page * PAGE_SIZE < data.total;
  const nextCursor = hasMore ? encodeCursor(page + 1) : null;

  return {
    items: data.items,
    nextCursor,
    total: data.total,
  };
}
