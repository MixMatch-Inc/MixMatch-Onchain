import Link from 'next/link';

interface DiscoveryItem {
  id: string;
  stageName: string;
  bio?: string;
  availabilityStatus: string;
}

interface DiscoveryResponse {
  items: DiscoveryItem[];
}

const apiBaseUrl = (): string =>
  process.env.NEXT_PUBLIC_API_URL?.trim() || 'http://localhost:3001';

export default async function DiscoverPage() {
  const response = await fetch(`${apiBaseUrl()}/discover/djs`, { cache: 'no-store' });
  const payload = response.ok ? ((await response.json()) as DiscoveryResponse) : { items: [] };

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-16">
      <section className="mx-auto max-w-6xl space-y-4">
        {payload.items.map((item) => (
          <Link
            key={item.id}
            href={`/dashboard/discover/${item.id}`}
            className="block rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:border-zinc-300"
          >
            <h2 className="text-xl font-semibold text-zinc-900">{item.stageName}</h2>
            <p className="mt-2 text-sm text-zinc-600">{item.bio || 'No bio added yet.'}</p>
            <p className="mt-3 text-xs font-medium uppercase tracking-[0.15em] text-zinc-500">
              {item.availabilityStatus}
            </p>
          </Link>
        ))}
      </section>
    </main>
  );
}
