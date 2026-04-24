'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { apiRequest } from '@/lib/api/client';

type RevealStatus = 'PENDING' | 'REVEALED' | 'BLOCKED';
type SongExchangeState = 'NONE' | 'SENT' | 'RECEIVED' | 'EXCHANGED';

interface ResonanceItem {
  id: string;
  matchedUserId: string;
  revealStatus: RevealStatus;
  songExchangeState: SongExchangeState;
  lastActivityAt: string;
  createdAt: string;
}

interface ResonanceListResponse {
  items: ResonanceItem[];
  page: number;
  pageSize: number;
  total: number;
}

const REVEAL_LABEL: Record<RevealStatus, string> = {
  PENDING: 'Pending',
  REVEALED: 'Revealed',
  BLOCKED: 'Blocked',
};

const REVEAL_STYLE: Record<RevealStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  REVEALED: 'bg-emerald-100 text-emerald-700',
  BLOCKED: 'bg-red-100 text-red-700',
};

const SONG_LABEL: Record<SongExchangeState, string> = {
  NONE: 'No exchange yet',
  SENT: 'Song sent',
  RECEIVED: 'Song received',
  EXCHANGED: 'Songs exchanged ✓',
};

export default function ResonanceInboxPage() {
  const token = useAuthStore((s) => s.token);
  const [data, setData] = useState<ResonanceListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    apiRequest<ResonanceListResponse>('/resonance', { token })
      .then((res) => { if (!cancelled) setData(res); })
      .catch((err: Error) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [token]);

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-16">
      <section className="mx-auto max-w-4xl space-y-6">
        <header className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-semibold text-zinc-900">Resonance Inbox</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Your mutual matches — reveal status and first-song exchange.
          </p>
        </header>

        {loading && (
          <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-sm text-zinc-500 shadow-sm">
            Loading resonances...
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-sm text-red-700 shadow-sm">
            {error}
          </div>
        )}

        {!loading && !error && data?.items.length === 0 && (
          <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
            <p className="text-sm text-zinc-500">No resonances yet.</p>
            <p className="mt-1 text-xs text-zinc-400">
              Mutual matches will appear here once you and another user both signal interest.
            </p>
          </div>
        )}

        {!loading && !error && data && data.items.length > 0 && (
          <>
            <ul className="space-y-3">
              {data.items.map((item) => (
                <li
                  key={item.id}
                  className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-zinc-900">
                        Match #{item.id.slice(-6)}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {SONG_LABEL[item.songExchangeState]}
                      </p>
                      <p className="text-xs text-zinc-400">
                        Last activity:{' '}
                        {new Date(item.lastActivityAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${REVEAL_STYLE[item.revealStatus]}`}
                    >
                      {REVEAL_LABEL[item.revealStatus]}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
            <p className="text-right text-xs text-zinc-400">
              {data.total} total · page {data.page}
            </p>
          </>
        )}
      </section>
    </main>
  );
}
