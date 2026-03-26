'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';

export default function DashboardPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login?next=%2Fdashboard');
      return;
    }

    if (user && !user.onboardingCompleted) {
      router.replace('/onboarding');
    }
  }, [isAuthenticated, router, user]);

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-16">
      <section className="mx-auto max-w-3xl rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-900">Dashboard</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Users who have completed onboarding can continue into dashboard features here.
        </p>
      </section>
    </main>
  );
}
