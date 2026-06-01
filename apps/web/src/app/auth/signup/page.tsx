'use client';

import { useAuthForm } from '@/hooks/useAuthForm';
import { AuthNotice }  from '@/components/auth/AuthNotice';

export default function SignupPage() {
  const { state, setField, submit } = useAuthForm('signup');
  const isBlocked = state.cooldown?.active || state.throttle?.limited;

  // Show confirmation-pending state
  if (state.success && state.data === null) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-sm text-center space-y-3">
          <h1 className="text-2xl font-semibold text-gray-900">Check your email</h1>
          <p className="text-sm text-gray-600">
            We sent a confirmation link to <strong>{state.email}</strong>.
            Click it to activate your account.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm space-y-6 rounded-xl bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-900">Create account</h1>

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
          aria-label="Signup form"
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
              autoComplete="new-password"
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
                       text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {state.loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600">
          Already have an account?{' '}
          <a href="/auth/login" className="font-medium text-indigo-600 hover:underline">
            Sign in
          </a>
        </p>
      </div>
    </main>
  );
}
