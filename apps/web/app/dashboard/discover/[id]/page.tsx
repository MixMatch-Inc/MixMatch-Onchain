interface DjProfileResponse {
  profile?: {
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
    socialLinks?: Record<string, string | undefined>;
  };
}

const apiBaseUrl = (): string =>
  process.env.NEXT_PUBLIC_API_URL?.trim() || 'http://localhost:3001';

export default async function DjDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const response = await fetch(`${apiBaseUrl()}/discover/djs/${id}`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    return (
      <main className="min-h-screen bg-zinc-50 px-6 py-16">
        <section className="mx-auto max-w-3xl rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-semibold text-zinc-900">DJ not found</h1>
          <p className="mt-2 text-sm text-zinc-600">
            The profile you requested does not exist or is not yet published.
          </p>
        </section>
      </main>
    );
  }

  const payload = (await response.json()) as DjProfileResponse;
  const profile = payload.profile;

  if (!profile) {
    return null;
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-16">
      <section className="mx-auto max-w-4xl rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
              {profile.availabilityStatus}
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-zinc-900">
              {profile.stageName}
            </h1>
          </div>
          <div className="rounded-full bg-zinc-100 px-4 py-2 text-sm text-zinc-700">
            {profile.pricing.min} - {profile.pricing.max}
          </div>
        </div>

        <p className="mt-6 text-sm leading-6 text-zinc-600">
          {profile.bio || 'This DJ has not added a bio yet.'}
        </p>

        <div className="mt-6">
          <h2 className="text-sm font-semibold text-zinc-900">Genres</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {profile.genres.map((genre) => (
              <span
                key={genre}
                className="rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-700"
              >
                {genre}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <h2 className="text-sm font-semibold text-zinc-900">Vibe tags</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {profile.vibeTags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-zinc-900 px-3 py-1 text-xs text-white"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
