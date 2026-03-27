'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth.store';

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
  };
}

const apiBaseUrl = (): string =>
  process.env.NEXT_PUBLIC_API_URL?.trim() || 'http://localhost:3001';

export default function DjDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);

  const [profile, setProfile] = useState<DjProfileResponse['profile'] | null>(null);
  const [eventType, setEventType] = useState('CLUB');
  const [eventDate, setEventDate] = useState('');
  const [budget, setBudget] = useState('');
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    void params.then(async ({ id }) => {
      const response = await fetch(`${apiBaseUrl()}/discover/djs/${id}`);
      const payload = (await response.json()) as DjProfileResponse;

      if (!ignore) {
        setProfile(payload.profile ?? null);
      }
    });

    return () => {
      ignore = true;
    };
  }, [params]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setErrorMessage(null);

    const resolved = await params;

    if (!token) {
      setErrorMessage('Sign in as a planner to create a booking request.');
      return;
    }

    try {
      const response = await fetch(`${apiBaseUrl()}/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          djId: resolved.id,
          eventType,
          eventDate: new Date(eventDate).toISOString(),
          budget: Number(budget),
          notes: notes || undefined,
        }),
      });

      const payload = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(payload.message ?? 'Unable to create booking request.');
      }

      setMessage('Booking request created successfully.');
      setEventDate('');
      setBudget('');
      setNotes('');
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to create booking request.',
      );
    }
  };

  if (!profile) {
    return (
      <main className="min-h-screen bg-zinc-50 px-6 py-16">
        <section className="mx-auto max-w-3xl rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
          <p className="text-sm text-zinc-600">Loading DJ profile...</p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-16">
      <section className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1.3fr_0.9fr]">
        <article className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
            {profile.availabilityStatus}
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-zinc-900">
            {profile.stageName}
          </h1>
          <p className="mt-4 text-sm leading-6 text-zinc-600">
            {profile.bio || 'This DJ has not added a bio yet.'}
          </p>
        </article>

        <aside className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-zinc-900">Request a booking</h2>
          <p className="mt-2 text-sm text-zinc-600">
            Only planner accounts can submit booking requests.
          </p>

          {user?.role !== 'PLANNER' ? (
            <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              Switch to a planner account to send a booking request.
            </div>
          ) : (
            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <select
                value={eventType}
                onChange={(event) => setEventType(event.target.value)}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
              >
                <option value="CLUB">CLUB</option>
                <option value="CONCERT">CONCERT</option>
                <option value="CORPORATE">CORPORATE</option>
                <option value="FESTIVAL">FESTIVAL</option>
                <option value="PRIVATE_PARTY">PRIVATE_PARTY</option>
                <option value="WEDDING">WEDDING</option>
              </select>
              <input
                type="datetime-local"
                value={eventDate}
                onChange={(event) => setEventDate(event.target.value)}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
              />
              <input
                type="number"
                min="0"
                value={budget}
                onChange={(event) => setBudget(event.target.value)}
                placeholder="Budget"
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
              />
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Notes"
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
              />

              {message ? (
                <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  {message}
                </p>
              ) : null}

              {errorMessage ? (
                <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {errorMessage}
                </p>
              ) : null}

              <button
                type="submit"
                className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
              >
                Send booking request
              </button>
            </form>
          )}
        </aside>
      </section>
    </main>
  );
}
