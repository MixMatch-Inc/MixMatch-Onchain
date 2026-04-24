/**
 * Discovery Feed Query Layer (#206)
 *
 * Typed, reusable data-access layer for discovery surfaces.
 * Handles cursor pagination, filter persistence, cursor reset on filter change,
 * and normalises blind vs standard payload shapes for the UI layer.
 */

import { RevealPhase } from '@mixmatch/types';
import { apiRequest } from './client';

// ── Types ─────────────────────────────────────────────────────────────────

export interface DiscoveryFilters {
  q?: string;
  genre?: string;
  availabilityStatus?: string;
}

export interface RawDiscoveryItem {
  id: string;
  stageName: string;
  bio?: string;
  genres: string[];
  vibeTags: string[];
  pricing?: { min: number; max: number };
  availabilityStatus: string;
  location?: string;
  createdAt?: string;
}

export interface NormalizedDiscoveryItem extends RawDiscoveryItem {
  revealPhase: RevealPhase;
}

export interface DiscoveryPage {
  items: NormalizedDiscoveryItem[];
  nextCursor: string | null;
  hasNextPage: boolean;
}

interface RawPage {
  items: RawDiscoveryItem[];
  nextCursor?: string;
  hasNextPage?: boolean;
}

// ── Normalizer ────────────────────────────────────────────────────────────

/**
 * Blind mode: strip identity fields and force BLIND phase.
 * Standard mode: pass through with FULL phase (server already redacts per reveal state).
 */
function normalize(item: RawDiscoveryItem, blind: boolean): NormalizedDiscoveryItem {
  if (blind) {
    return {
      id: item.id,
      stageName: 'Anonymous DJ',
      genres: item.genres,
      vibeTags: item.vibeTags,
      availabilityStatus: item.availabilityStatus,
      revealPhase: RevealPhase.BLIND,
    };
  }
  return { ...item, revealPhase: RevealPhase.FULL };
}

// ── Query builder ─────────────────────────────────────────────────────────

function buildPath(filters: DiscoveryFilters, cursor?: string, limit = 20): string {
  const params = new URLSearchParams();
  if (filters.q?.trim()) params.set('q', filters.q.trim());
  if (filters.genre?.trim()) params.set('genre', filters.genre.trim());
  if (filters.availabilityStatus?.trim()) params.set('availabilityStatus', filters.availabilityStatus.trim());
  if (cursor) params.set('cursor', cursor);
  params.set('limit', String(limit));
  const qs = params.toString();
  return `/discover/djs${qs ? `?${qs}` : ''}`;
}

// ── Fetcher ───────────────────────────────────────────────────────────────

export async function fetchDiscoveryPage(
  filters: DiscoveryFilters,
  options: { token: string; cursor?: string; blind?: boolean; limit?: number },
): Promise<DiscoveryPage> {
  const { token, cursor, blind = false, limit } = options;
  const path = buildPath(filters, cursor, limit);
  const raw = await apiRequest<RawPage>(path, { token });

  return {
    items: raw.items.map((item) => normalize(item, blind)),
    nextCursor: raw.nextCursor ?? null,
    hasNextPage: raw.hasNextPage ?? false,
  };
}

// ── Stateful feed accumulator ─────────────────────────────────────────────

export interface FeedState {
  items: NormalizedDiscoveryItem[];
  cursor: string | null;
  hasNextPage: boolean;
  filters: DiscoveryFilters;
  loading: boolean;
  error: string | null;
}

export type FeedAction =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; page: DiscoveryPage; append: boolean }
  | { type: 'FETCH_ERROR'; message: string }
  | { type: 'SET_FILTERS'; filters: DiscoveryFilters };

export function feedReducer(state: FeedState, action: FeedAction): FeedState {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, loading: true, error: null };

    case 'FETCH_SUCCESS':
      return {
        ...state,
        loading: false,
        items: action.append
          ? dedupeById([...state.items, ...action.page.items])
          : action.page.items,
        cursor: action.page.nextCursor,
        hasNextPage: action.page.hasNextPage,
      };

    case 'FETCH_ERROR':
      return { ...state, loading: false, error: action.message };

    case 'SET_FILTERS':
      // Reset cursor when filters change to prevent duplicate cards
      return { ...state, filters: action.filters, cursor: null, items: [] };

    default:
      return state;
  }
}

export const initialFeedState = (filters: DiscoveryFilters = {}): FeedState => ({
  items: [],
  cursor: null,
  hasNextPage: false,
  filters,
  loading: false,
  error: null,
});

function dedupeById(items: NormalizedDiscoveryItem[]): NormalizedDiscoveryItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}
