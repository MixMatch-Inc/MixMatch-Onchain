export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-16">
      <section className="mx-auto max-w-3xl rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-900">Dashboard</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Browse the discovery section to view detailed DJ profiles.
        </p>
      </section>
    </main>
'use client';

import { UserRole } from '@mixmatch/types';
import { useAuthStore } from '@/store/auth.store';

const overviewByRole: Record<UserRole, { title: string; description: string }> = {
  [UserRole.DJ]: {
    title: 'Your DJ workspace',
    description: 'Manage the profile, bookings, and payout details that help planners hire you.',
  },
  [UserRole.PLANNER]: {
    title: 'Your planner workspace',
    description: 'Browse DJs, send booking requests, and manage upcoming event activity.',
  },
  [UserRole.MUSIC_LOVER]: {
    title: 'Your discovery workspace',
    description: 'Keep track of artists, genres, and vibe profiles you want to explore next.',
  },
  [UserRole.ADMIN]: {
    title: 'Your admin workspace',
    description: 'Inspect platform activity and support users across the marketplace.',
  },
};

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);

  const overview = user ? overviewByRole[user.role] : null;

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
      <h2 className="text-2xl font-semibold text-zinc-900">
        {overview?.title ?? 'Dashboard overview'}
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-zinc-600">
        {overview?.description ??
          'Sign in to access the role-specific dashboard experience.'}
      </p>
    </section>
  );
}
