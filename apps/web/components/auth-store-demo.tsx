'use client';

import { UserRole } from '@mixmatch/types';
import { useAuthStore } from '@/store/auth.store';

export function AuthStoreDemo() {
  const user = useAuthStore((state) => state.user);
  const role = useAuthStore((state) => state.role);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const login = useAuthStore((state) => state.login);
  const logout = useAuthStore((state) => state.logout);

  return (
    <section className="w-full max-w-2xl rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-zinc-900">Auth Store Snapshot</h2>
      <p className="mt-3 text-sm text-zinc-700">isAuthenticated: {String(isAuthenticated)}</p>
      <p className="text-sm text-zinc-700">role: {role ?? 'NONE'}</p>
      <p className="text-sm text-zinc-700">user: {user ? `${user.name} (${user.email})` : 'NONE'}</p>

      <div className="mt-4 flex gap-3">
        <button
          type="button"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
          onClick={() => {
            login({
              token: 'demo-token',
              user: {
                id: 'demo-user-id',
                name: 'Demo DJ',
                email: 'demo@mixmatch.io',
                role: UserRole.DJ,
                onboardingCompleted: false,
              },
            });
          }}
        >
          Mock Login
        </button>
        <button
          type="button"
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800"
          onClick={logout}
        >
          Logout
        </button>
      </div>
    </section>
  );
}
