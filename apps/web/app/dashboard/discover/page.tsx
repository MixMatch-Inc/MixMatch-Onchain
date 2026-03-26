'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

interface DiscoveryItem {
  id: string;
  stageName: string;
  bio?: string;
  genres: string[];
  vibeTags: string[];
  pricing: {
    min: number;
    max: number;
  };
  availabilityStatus: string;
}

interface DiscoveryResponse {
  items: DiscoveryItem[];
  page: number;
  pageSize: number;
  total: number;
}

const apiBaseUrl = (): string => process.env.NEXT_PUBLIC_API_URL?.trim() || 'http://localhost:3001';

export default function DiscoverPage() {
  const [query, setQuery] = useState('');
  const [genre, setGenre] = useState('');
  const [status, setStatus] = useState('');
  const [results, setResults] = useState<DiscoveryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const endpoint = useMemo(() => {
    const params = new URLSearchParams();

    if (query.trim()) params.set('q', query.trim());
    if (genre.trim()) params.set('genre', genre.trim());
    if (status.trim()) params.set('availabilityStatus', status.trim());

    const suffix = params.toString();
    return `${apiBaseUrl()}/discover/djs${suffix ? `?${suffix}` : ''}`;
  }, [genre, query, status]);

  useEffect(() => {
    let isCancelled = false;

    const load = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const response = await fetch(endpoint);
        const payload = (await response.json()) as DiscoveryResponse & { message?: string };

        if (!response.ok) {
          throw new Error(payload.message ?? 'Unable to load DJ discovery right now.');
        }

        if (!isCancelled) {
          setResults(payload);
        }
      } catch (error) {
        if (!isCancelled) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'Unable to load DJ discovery right now.',
          );
          setResults(null);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      isCancelled = true;
    };
  }, [endpoint]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setQuery(query.trim());
  };

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-16">
      <section className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-semibold text-zinc-900">Discover DJs</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Browse published DJ profiles by genre, availability, and search terms.
          </p>

          <form className="mt-6 grid gap-3 md:grid-cols-4" onSubmit={handleSubmit}>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search stage name or vibe"
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
            />
            <input
              value={genre}
              onChange={(event) => setGenre(event.target.value)}
              placeholder="Genre"
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
            />
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
            >
              <option value="">All availability</option>
              <option value="AVAILABLE">Available</option>
              <option value="LIMITED">Limited</option>
              <option value="UNAVAILABLE">Unavailable</option>
            </select>
            <button
              type="submit"
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Apply filters
            </button>
          </form>
        </header>

        {isLoading ? (
          <section className="rounded-2xl border border-zinc-200 bg-white p-8 text-sm text-zinc-600 shadow-sm">
            Loading DJs...
          </section>
        ) : null}

        {errorMessage ? (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-8 text-sm text-red-700 shadow-sm">
            {errorMessage}
          </section>
        ) : null}

        {!isLoading && !errorMessage && results?.items.length === 0 ? (
          <section className="rounded-2xl border border-zinc-200 bg-white p-8 text-sm text-zinc-600 shadow-sm">
            No DJs matched the current filters.
          </section>
        ) : null}

        {!isLoading && !errorMessage && results?.items.length ? (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {results.items.map((item) => (
              <article
                key={item.id}
                className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-zinc-900">
                      {item.stageName}
                    </h2>
                    <p className="mt-1 text-xs font-medium uppercase tracking-[0.15em] text-zinc-500">
                      {item.availabilityStatus}
                    </p>
                  </div>
                  <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-700">
                    {item.pricing.min} - {item.pricing.max}
                  </span>
                </div>

                <p className="mt-4 text-sm text-zinc-600">
                  {item.bio || 'No bio added yet.'}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {item.genres.map((value) => (
                    <span
                      key={`${item.id}-${value}`}
                      className="rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-700"
                    >
                      {value}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </section>
        ) : null}
      </section>
    </main>
  );
}
