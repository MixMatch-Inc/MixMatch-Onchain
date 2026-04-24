'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RevealPhase } from '@mixmatch/types';
import { useAuthStore } from '@/store/auth.store';
import { useBlindListeningStore } from '@/store/blind-listening.store';
import { apiRequest } from '@/lib/api/client';
import { BlindListeningToggle } from '@/components/blind-listening-toggle';
import { DiscoveryCard, type DiscoveryCardData } from '@/components/discovery-card';

interface BlindDjItem {
  id: string;
  stageName: string;
  genres: string[];
  vibeTags: string[];
  availabilityStatus: string;
}

interface DiscoveryResponse {
  items: BlindDjItem[];
}

export default function BlindDiscoverPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const blindMode = useBlindListeningStore((s) => s.blindMode);
  const disable = useBlindListeningStore((s) => s.disable);

  const [items, setItems] = useState<DiscoveryCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Route isolation: redirect out when blind mode is disabled
  useEffect(() => {
    if (!blindMode) {
      router.replace('/dashboard/discover');
    }
  }, [blindMode, router]);

  useEffect(() => {
    if (!blindMode || !token) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    // Request only anonymous payloads — no identity fields
    apiRequest<DiscoveryResponse>('/discover/djs', { token })
      .then((data) => {
        if (cancelled) return;
        setItems(
          data.items.map((dj) => ({
            id: dj.id,
            // Force BLIND phase so identity fields are never rendered
            stageName: dj.stageName,
            genres: dj.genres,
            vibeTags: dj.vibeTags,
            availabilityStatus: dj.availabilityStatus,
            revealPhase: RevealPhase.BLIND,
          })),
        );
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [blindMode, token]);

  if (!blindMode) return null;

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-16 text-white">
      <section className="mx-auto max-w-6xl space-y-6">
        <header className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900 p-8">
          <div>
            <h1 className="text-2xl font-semibold">Blind Listening</h1>
            <p className="mt-1 text-sm text-zinc-400">
              Profiles are fully anonymous. No identity fields are loaded.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <BlindListeningToggle />
            <button
              type="button"
              onClick={() => {
                disable();
                router.push('/dashboard/discover');
              }}
              className="rounded-md border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
            >
              Exit blind mode
            </button>
          </div>
        </header>

        {loading && (
          <p className="text-sm text-zinc-500">Loading anonymous profiles...</p>
        )}
        {error && (
          <p className="rounded-xl border border-red-800 bg-red-950 p-4 text-sm text-red-400">
            {error}
          </p>
        )}
        {!loading && !error && items.length === 0 && (
          <p className="text-sm text-zinc-500">No profiles available right now.</p>
        )}

        {!loading && !error && items.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => (
              <DiscoveryCard key={item.id} data={item} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
