import { authHeaders, request } from './api-client';

export interface DeckCard {
  user_id: string;
  display_name: string;
  avatar_url?: string | null;
  top_artists: string[];
  top_genres: string[];
}

export interface DeckResponse {
  user_id: string;
  deck: DeckCard[];
  daily_limit: number;
  swipes_today: number;
  remaining_today: number;
}

export function getDeck(accessToken: string, limit = 20): Promise<DeckResponse> {
  return request<DeckResponse>(`/deck?limit=${limit}`, { headers: authHeaders(accessToken) });
}

export function postSwipe(
  input: { swiped_id: string; direction: 'like' | 'pass' },
  accessToken: string,
): Promise<{ ok: boolean; match: { id: string } | null }> {
  return request('/swipes', {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify(input),
  });
}
