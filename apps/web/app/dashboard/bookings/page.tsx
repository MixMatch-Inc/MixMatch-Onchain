'use client';

import { useEffect, useMemo, useState } from 'react';
import { UserRole } from '@mixmatch/types';
import { useAuthStore } from '@/store/auth.store';

interface BookingItem {
  id: string;
  planner: string;
  dj: string;
  eventType: string;
  eventDate: string;
  budget: number;
  notes?: string;
  status: string;
  paymentStatus: string;
  createdAt: string;
}

interface BookingsResponse {
  items: BookingItem[];
}

const apiBaseUrl = (): string =>
  process.env.NEXT_PUBLIC_API_URL?.trim() || 'http://localhost:3001';

export default function BookingsPage() {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);

  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const heading = useMemo(() => {
    if (user?.role === UserRole.DJ) {
      return {
        title: 'Received booking requests',
        description: 'Review the requests sent to your DJ profile.',
      };
    }

    return {
      title: 'Sent booking requests',
      description: 'Track the requests you have sent to DJs.',
    };
  }, [user?.role]);

  useEffect(() => {
    let ignore = false;

    const load = async () => {
      if (!token) {
        setBookings([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);

      try {
        const response = await fetch(`${apiBaseUrl()}/bookings/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const payload = (await response.json()) as BookingsResponse & { message?: string };

        if (!response.ok) {
          throw new Error(payload.message ?? 'Unable to load bookings.');
        }

        if (!ignore) {
          setBookings(payload.items);
        }
      } catch (error) {
        if (!ignore) {
          setErrorMessage(
            error instanceof Error ? error.message : 'Unable to load bookings.',
          );
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      ignore = true;
    };
  }, [token]);

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-16">
      <section className="mx-auto max-w-5xl space-y-6">
        <header className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-semibold text-zinc-900">{heading.title}</h1>
          <p className="mt-2 text-sm text-zinc-600">{heading.description}</p>
        </header>

        {isLoading ? (
          <section className="rounded-2xl border border-zinc-200 bg-white p-8 text-sm text-zinc-600 shadow-sm">
            Loading bookings...
          </section>
        ) : null}

        {errorMessage ? (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-8 text-sm text-red-700 shadow-sm">
            {errorMessage}
          </section>
        ) : null}

        {!isLoading && !errorMessage && bookings.length === 0 ? (
          <section className="rounded-2xl border border-zinc-200 bg-white p-8 text-sm text-zinc-600 shadow-sm">
            No bookings yet. This inbox will populate as requests are created.
          </section>
        ) : null}

        {!isLoading && !errorMessage && bookings.length > 0 ? (
          <section className="space-y-4">
            {bookings.map((booking) => (
              <article
                key={booking.id}
                className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-zinc-900">
                      {booking.eventType}
                    </h2>
                    <p className="mt-1 text-sm text-zinc-600">
                      Event date: {new Date(booking.eventDate).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-700">
                      {booking.status}
                    </span>
                    <span className="rounded-full bg-zinc-900 px-3 py-1 text-xs text-white">
                      {booking.paymentStatus}
                    </span>
                  </div>
                </div>
                <p className="mt-4 text-sm text-zinc-600">
                  {booking.notes || 'No additional notes.'}
                </p>
                <p className="mt-4 text-sm font-medium text-zinc-800">
                  Budget: {booking.budget}
                </p>
              </article>
            ))}
          </section>
        ) : null}
      </section>
    </main>
  );
}
