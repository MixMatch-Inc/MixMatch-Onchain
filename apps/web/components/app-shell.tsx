'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserRole } from '@mixmatch/types';
import { useAuthStore } from '@/store/auth.store';
import { FEATURE_FLAGS } from '@/lib/feature-flags';

interface NavItem {
  href: string;
  label: string;
  flag?: keyof typeof FEATURE_FLAGS;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/journeys', label: 'Journeys' },
  { href: '/discover', label: 'Discover' },
  { href: '/blind-mode', label: 'Blind Mode', flag: 'blindMode' },
  { href: '/resonance', label: 'Resonances' },
  { href: '/messages', label: 'Messages', flag: 'messages' },
  { href: '/events', label: 'Events', flag: 'events' },
  { href: '/wallet', label: 'Wallet', flag: 'wallet' },
  { href: '/settings', label: 'Settings' },
];

const ROLE_NAV_OVERRIDES: Partial<Record<UserRole, string[]>> = {
  [UserRole.DJ]: ['/journeys', '/discover', '/resonance', '/messages', '/settings'],
  [UserRole.PLANNER]: ['/journeys', '/discover', '/resonance', '/messages', '/events', '/settings'],
  [UserRole.MUSIC_LOVER]: ['/journeys', '/discover', '/blind-mode', '/resonance', '/messages', '/settings'],
};

function isVisible(item: NavItem, role: UserRole | null): boolean {
  // Feature-flag gate
  if (item.flag && !FEATURE_FLAGS[item.flag]) return false;
  // Role gate
  if (role && ROLE_NAV_OVERRIDES[role]) {
    return ROLE_NAV_OVERRIDES[role]!.includes(item.href);
  }
  return true;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const role = user?.role ?? null;

  const visibleItems = NAV_ITEMS.filter((item) => isVisible(item, role));

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 lg:flex-row">
      {/* Sidebar — desktop */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-zinc-200 bg-white lg:flex">
        <div className="px-6 py-5">
          <span className="text-lg font-bold tracking-tight text-zinc-900">MixMatch</span>
          {role && (
            <p className="mt-0.5 text-xs font-medium uppercase tracking-widest text-zinc-400">
              {role}
            </p>
          )}
        </div>
        <nav className="flex-1 space-y-1 px-3 pb-6">
          {visibleItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                pathname.startsWith(item.href)
                  ? 'bg-zinc-100 text-zinc-900'
                  : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-zinc-200 px-4 py-4">
          <p className="truncate text-sm font-medium text-zinc-700">{user?.name}</p>
          <button
            type="button"
            onClick={logout}
            className="mt-2 text-xs text-zinc-400 hover:text-zinc-700"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col">
        {/* Top bar — mobile */}
        <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 lg:hidden">
          <span className="text-base font-bold text-zinc-900">MixMatch</span>
        </header>

        <main className="flex-1">{children}</main>

        {/* Bottom nav — mobile */}
        <nav className="flex border-t border-zinc-200 bg-white lg:hidden">
          {visibleItems.slice(0, 5).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center py-2 text-xs font-medium transition-colors ${
                pathname.startsWith(item.href)
                  ? 'text-zinc-900'
                  : 'text-zinc-400 hover:text-zinc-700'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
