'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthForm } from '@/hooks/useAuthForm';
import { AuthNotice }  from '@/components/auth/AuthNotice';

export default function LoginPage() {
  const router           = useRouter();
  const { state, setField, submit } = useAuthForm('login');

  // Redirect on success
  useEffect(() => {
    if (state.success) {
      router.push('/dashboard');
    }
  }, [state.success, router]);

  const isBlocked = state.cooldown?.active || state.throttle?.limited;

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm space-y-6 rounded-xl bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-900">Sign in</h1>

        {/* Throttle / cooldown / risk / error / success notices */}
        <AuthNotice
          error={state.error}
          message={state.message}
          throttle={state.throttle}
          cooldown={state.cooldown}
          risk={state.risk}
        />

        <form
          onSubmit={(e) => { e.preventDefault(); void submit(); }}
          className="space-y-4"
          aria-label="Login form"
        >
          <div className="space-y-1">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              disabled={state.loading || !!isBlocked}
              value={state.email}
              onChange={(e) => setField('email')(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm
                         focus:outline-none focus:ring-2 focus:ring-indigo-500
                         disabled:opacity-50"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              disabled={state.loading || !!isBlocked}
              value={state.password}
              onChange={(e) => setField('password')(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm
                         focus:outline-none focus:ring-2 focus:ring-indigo-500
                         disabled:opacity-50"
            />
          </div>

          <button
            type="submit"
            disabled={state.loading || !!isBlocked}
            className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium
                       text-white hover:bg-indigo-700 disabled:opacity-50
                       focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {state.loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600">
          Don&apos;t have an account?{' '}
          <a href="/auth/signup" className="font-medium text-indigo-600 hover:underline">
            Sign up
          </a>
        </p>
      </div>
    </main>
  );
}
