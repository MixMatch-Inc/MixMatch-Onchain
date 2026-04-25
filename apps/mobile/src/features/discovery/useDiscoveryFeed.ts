import { useCallback, useEffect, useRef, useState } from 'react';
import type { DjDiscoveryItemDto } from '@mixmatch/types';
import { fetchDiscoveryPage } from './discoveryAdapter';
import type { DiscoveryFilters } from './discovery.types';

interface FeedState {
  items: DjDiscoveryItemDto[];
  isLoading: boolean;
  isLoadingMore: boolean;
  error: Error | null;
  hasMore: boolean;
}

/**
 * Manages a paginated discovery feed with:
 * - cursor-based pagination (loadMore)
 * - automatic cursor reset when filters change
 * - AbortController cancellation on rapid filter changes
 */
export function useDiscoveryFeed(filters: DiscoveryFilters) {
  const filtersKey = JSON.stringify(filters);
  const [state, setState] = useState<FeedState>({
    items: [],
    isLoading: true,
    isLoadingMore: false,
    error: null,
    hasMore: false,
  });

  const cursorRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(
    async (reset: boolean) => {
      // Cancel any in-flight request
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      if (reset) {
        cursorRef.current = null;
        setState((s) => ({ ...s, isLoading: true, error: null }));
      } else {
        setState((s) => ({ ...s, isLoadingMore: true, error: null }));
      }

      try {
        const page = await fetchDiscoveryPage(
          cursorRef.current,
          filters,
          controller.signal,
        );

        cursorRef.current = page.nextCursor;

        setState((s) => ({
          items: reset ? page.items : [...s.items, ...page.items],
          isLoading: false,
          isLoadingMore: false,
          error: null,
          hasMore: page.nextCursor !== null,
        }));
      } catch (err) {
        if ((err as Error).name === 'AbortError') return; // stale — ignore
        setState((s) => ({
          ...s,
          isLoading: false,
          isLoadingMore: false,
          error: err as Error,
        }));
      }
    },
    [filters, filtersKey],
  );

  // Reset and reload whenever filters change
  useEffect(() => {
    load(true);
    return () => abortRef.current?.abort();
  }, [load]);

  const loadMore = useCallback(() => {
    if (!state.hasMore || state.isLoadingMore) return;
    load(false);
  }, [load, state.hasMore, state.isLoadingMore]);

  return { ...state, loadMore };
}
