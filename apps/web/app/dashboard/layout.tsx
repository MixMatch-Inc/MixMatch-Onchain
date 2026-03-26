'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UserRole } from '@mixmatch/types';
import { useAuthStore } from '@/store/auth.store';

const navByRole: Record<UserRole, Array<{ href: string; label: string }>> = {
  [UserRole.DJ]: [
    { href: '/dashboard', label: 'Overview' },
    { href: '/dashboard/profile', label: 'Profile' },
    { href: '/dashboard/bookings', label: 'Bookings' },
  ],
  [UserRole.PLANNER]: [
    { href: '/dashboard', label: 'Overview' },
    { href: '/dashboard/discover', label: 'Discover' },
    { href: '/dashboard/bookings', label: 'Bookings' },
  ],
  [UserRole.MUSIC_LOVER]: [
    { href: '/dashboard', label: 'Overview' },
    { href: '/dashboard/discover', label: 'Discover' },
    { href: '/dashboard/following', label: 'Following' },
  ],
  [UserRole.ADMIN]: [
    { href: '/dashboard', label: 'Overview' },
    { href: '/dashboard/users', label: 'Users' },
    { href: '/dashboard/audit', label: 'Audit' },
  ],
};

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const logout = useAuthStore((state) => state.logout);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login?next=%2Fdashboard');
      return;
    }

    if (user && !user.onboardingCompleted) {
      router.replace('/onboarding');
    }
  }, [isAuthenticated, router, user]);

  if (!user) {
    return (
      <main className="min-h-screen bg-zinc-50 px-6 py-16">
        <section className="mx-auto max-w-4xl rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
          <p className="text-sm text-zinc-600">Loading dashboard...</p>
        </section>
      </main>
    );
  }

  const navigation = navByRole[user.role];

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
              {user.role}
            </p>
            <h1 className="text-lg font-semibold text-zinc-900">MixMatch dashboard</h1>
          </div>
          <button
            type="button"
            onClick={logout}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-800"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8 lg:flex-row">
        <aside className="w-full rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm lg:max-w-xs">
          <nav className="space-y-2">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-lg px-3 py-2 text-sm text-zinc-700 transition hover:bg-zinc-100"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
