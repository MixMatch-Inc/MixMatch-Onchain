'use client';

import { useAuthStore } from '@/store/auth.store';

export function LogoutButton() {
  const logout = useAuthStore((state) => state.logout);

  return (
    <button
      type="button"
      onClick={logout}
      className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-800 transition hover:border-zinc-400 hover:bg-zinc-50"
    >
      Logout
    </button>
  );
}
