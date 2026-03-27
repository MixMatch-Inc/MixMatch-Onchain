'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth.store';

interface BookingResponse {
  booking?: {
    id: string;
    planner: string;
    dj: string;
    eventType: string;
    eventDate: string;
    budget: number;
    notes?: string;
    status: string;
    paymentStatus: string;
    responseNote?: string;
  };
  message?: string;
}

const apiBaseUrl = (): string =>
  process.env.NEXT_PUBLIC_API_URL?.trim() || 'http://localhost:3001';

export default function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);

  const [booking, setBooking] = useState<BookingResponse['booking'] | null>(null);
  const [responseNote, setResponseNote] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    void params.then(async ({ id }) => {
      if (!token) {
        return;
      }

      const response = await fetch(`${apiBaseUrl()}/bookings/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const payload = (await response.json()) as BookingResponse;

      if (!ignore) {
        if (response.ok) {
          setBooking(payload.booking ?? null);
        } else {
          setErrorMessage(payload.message ?? 'Unable to load booking.');
        }
      }
    });

    return () => {
      ignore = true;
    };
  }, [params, token]);

  const handleDecision = async (status: 'ACCEPTED' | 'DECLINED') => {
    setMessage(null);
    setErrorMessage(null);

    const { id } = await params;

    if (!token) {
      setErrorMessage('Sign in to manage this booking.');
      return;
    }

    try {
      const response = await fetch(`${apiBaseUrl()}/bookings/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status,
          responseNote: responseNote || undefined,
        }),
      });

      const payload = (await response.json()) as BookingResponse;

      if (!response.ok || !payload.booking) {
        throw new Error(payload.message ?? 'Unable to update booking.');
      }

      setBooking(payload.booking);
      setMessage(`Booking ${status.toLowerCase()} successfully.`);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to update booking.',
      );
    }
  };

  if (!booking && !errorMessage) {
    return (
      <main className="min-h-screen bg-zinc-50 px-6 py-16">
        <section className="mx-auto max-w-3xl rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
          <p className="text-sm text-zinc-600">Loading booking...</p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-16">
      <section className="mx-auto max-w-4xl space-y-6">
        <article className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
          {errorMessage ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage}
            </p>
          ) : null}
          {booking ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-semibold text-zinc-900">
                    {booking.eventType}
                  </h1>
                  <p className="mt-2 text-sm text-zinc-600">
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
                {booking.notes || 'No notes were included with this request.'}
              </p>

              <p className="mt-4 text-sm font-medium text-zinc-800">
                Budget: {booking.budget}
              </p>
            </>
          ) : null}
        </article>

        {booking && user?.role === 'DJ' ? (
          <form
            className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm"
            onSubmit={(event) => event.preventDefault()}
          >
            <h2 className="text-lg font-semibold text-zinc-900">DJ actions</h2>
            <textarea
              value={responseNote}
              onChange={(event) => setResponseNote(event.target.value)}
              placeholder="Optional response note"
              className="mt-4 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            />

            {message ? (
              <p className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {message}
              </p>
            ) : null}

            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => void handleDecision('ACCEPTED')}
                className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
              >
                Accept
              </button>
              <button
                type="button"
                onClick={() => void handleDecision('DECLINED')}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white"
              >
                Decline
              </button>
            </div>
          </form>
        ) : booking ? (
          <section className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-900">Planner view</h2>
            <p className="mt-2 text-sm text-zinc-600">
              This booking is read-only for planners.
            </p>
            {booking.responseNote ? (
              <p className="mt-4 text-sm text-zinc-700">
                DJ response: {booking.responseNote}
              </p>
            ) : null}
          </section>
        ) : null}
      </section>
    </main>
  );
}
