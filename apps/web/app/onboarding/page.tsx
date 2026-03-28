'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DjGenre, EventType, UserRole } from '@mixmatch/types';
import { useAuthStore } from '@/store/auth.store';

const apiBaseUrl = (): string => process.env.NEXT_PUBLIC_API_URL?.trim() || 'http://localhost:3001';

const genreOptions = Object.values(DjGenre);
const eventTypeOptions = Object.values(EventType);

export default function OnboardingPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const login = useAuthStore((state) => state.login);

  const [stageName, setStageName] = useState('');
  const [bio, setBio] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [website, setWebsite] = useState('');
  const [vibes, setVibes] = useState('');
  const [genres, setGenres] = useState<string[]>([]);
  const [eventTypes, setEventTypes] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const content = useMemo(() => {
    switch (user?.role) {
      case UserRole.DJ:
        return {
          title: 'Finish your DJ profile',
          description: 'Add the basics planners need to discover your sound.',
        };
      case UserRole.PLANNER:
        return {
          title: 'Finish your organizer profile',
          description: 'Tell MixMatch what kinds of events you book.',
        };
      case UserRole.MUSIC_LOVER:
        return {
          title: 'Finish your fan profile',
          description: 'Personalize your music discovery preferences.',
        };
      default:
        return {
          title: 'Complete onboarding',
          description: 'Sign in to continue.',
        };
    }
  }, [user?.role]);

  if (!user || !token) {
    return (
      <main className="min-h-screen bg-zinc-50 px-6 py-16">
        <section className="mx-auto max-w-2xl rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-semibold text-zinc-900">{content.title}</h1>
          <p className="mt-2 text-sm text-zinc-600">You need to sign in before completing onboarding.</p>
        </section>
      </main>
    );
  }

  const toggleListValue = (value: string, current: string[], setValue: (next: string[]) => void) => {
    setValue(
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    let body: Record<string, unknown>;

    switch (user.role) {
      case UserRole.DJ:
        body = {
          role: user.role,
          profile: {
            stageName,
            bio: bio || undefined,
            genres,
            vibeTags: vibes
              .split(',')
              .map((value) => value.trim())
              .filter(Boolean),
            pricing: { min: 0, max: 0 },
          },
        };
        break;
      case UserRole.PLANNER:
        body = {
          role: user.role,
          profile: {
            organizationName,
            typicalEventTypes: eventTypes,
            website: website || undefined,
          },
        };
        break;
      default:
        body = {
          role: user.role,
          profile: {
            favoriteGenres: genres,
            preferredVibes: vibes
              .split(',')
              .map((value) => value.trim())
              .filter(Boolean),
          },
        };
    }

    try {
      const response = await fetch(`${apiBaseUrl()}/profiles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const payload = (await response.json()) as { message?: string };

      if (!response.ok) {
        setErrorMessage(payload.message ?? 'Unable to save onboarding details.');
        return;
      }

      login({
        user: {
          ...user,
          onboardingCompleted: true,
        },
        token,
      });

      router.push('/dashboard');
    } catch {
      setErrorMessage('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-16">
      <section className="mx-auto max-w-2xl rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <header>
          <h1 className="text-2xl font-semibold text-zinc-900">{content.title}</h1>
          <p className="mt-2 text-sm text-zinc-600">{content.description}</p>
        </header>

        <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
          {user.role === UserRole.DJ ? (
            <>
              <input className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" placeholder="Stage name" value={stageName} onChange={(event) => setStageName(event.target.value)} />
              <textarea className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" placeholder="Short bio" value={bio} onChange={(event) => setBio(event.target.value)} />
            </>
          ) : null}

          {user.role === UserRole.PLANNER ? (
            <>
              <input className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" placeholder="Organization name" value={organizationName} onChange={(event) => setOrganizationName(event.target.value)} />
              <input className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" placeholder="Website" value={website} onChange={(event) => setWebsite(event.target.value)} />
            </>
          ) : null}

          <div>
            <p className="mb-2 text-sm font-medium text-zinc-800">
              {user.role === UserRole.PLANNER ? 'Event types' : 'Genres'}
            </p>
            <div className="flex flex-wrap gap-2">
              {(user.role === UserRole.PLANNER ? eventTypeOptions : genreOptions).map((option) => {
                const isSelected = (user.role === UserRole.PLANNER ? eventTypes : genres).includes(option);
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() =>
                      user.role === UserRole.PLANNER
                        ? toggleListValue(option, eventTypes, setEventTypes)
                        : toggleListValue(option, genres, setGenres)
                    }
                    className={`rounded-full border px-3 py-2 text-sm ${isSelected ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-300 bg-white text-zinc-700'}`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </div>

          <input
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            placeholder={user.role === UserRole.PLANNER ? 'Optional planning styles or notes' : 'Comma-separated vibe tags'}
            value={vibes}
            onChange={(event) => setVibes(event.target.value)}
          />

          {errorMessage ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {isSubmitting ? 'Saving...' : 'Save and continue'}
          </button>
        </form>
      </section>
    </main>
  );
}
