'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UserRole } from '@mixmatch/types';
import { useAuthStore } from '@/store/auth.store';

const onboardingContent: Record<
  UserRole,
  {
    title: string;
    description: string;
    steps: string[];
  }
> = {
  [UserRole.DJ]: {
    title: 'DJ onboarding',
    description: 'Set up the public details planners need before you can be discovered.',
    steps: [
      'Claim your stage name and core identity.',
      'Add genres, vibe tags, and pricing guidance.',
      'Confirm your availability before publishing.',
    ],
  },
  [UserRole.PLANNER]: {
    title: 'Organizer onboarding',
    description: 'Tell MixMatch what kinds of events you run so bookings can start quickly.',
    steps: [
      'Add your organization or venue identity.',
      'Choose the event types you book most often.',
      'Review the dashboard flow for sending booking requests.',
    ],
  },
  [UserRole.MUSIC_LOVER]: {
    title: 'Fan onboarding',
    description: 'Personalize your music discovery experience before you start following DJs.',
    steps: [
      'Select your favorite genres.',
      'Choose the moods and vibes you want to explore.',
      'Review how discovery and saved DJs will work.',
    ],
  },
  [UserRole.ADMIN]: {
    title: 'Admin onboarding',
    description: 'Admin setup is not required for the public MVP flow.',
    steps: ['You can proceed directly to the dashboard.'],
  },
};

export default function OnboardingPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login?next=%2Fonboarding');
      return;
    }

    if (user?.onboardingCompleted) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, router, user]);

  if (!user) {
    return (
      <main className="min-h-screen bg-zinc-50 px-6 py-16">
        <section className="mx-auto max-w-2xl rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
          <p className="text-sm text-zinc-600">Loading onboarding...</p>
        </section>
      </main>
    );
  }

  const content = onboardingContent[user.role];

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-16">
      <section className="mx-auto max-w-3xl rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <header>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
            {user.role}
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-zinc-900">{content.title}</h1>
          <p className="mt-3 max-w-2xl text-sm text-zinc-600">{content.description}</p>
        </header>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {content.steps.map((step, index) => (
            <article
              key={step}
              className="rounded-xl border border-zinc-200 bg-zinc-50 p-4"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Step {index + 1}
              </p>
              <p className="mt-2 text-sm text-zinc-700">{step}</p>
            </article>
          ))}
        </div>

        <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Detailed onboarding forms will plug into this shell in the next profile implementation pass.
        </div>
      </section>
    </main>
  );
}
