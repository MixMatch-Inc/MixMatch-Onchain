'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserRole } from '@mixmatch/types';
import { useAuthStore } from '@/store/auth.store';

type SelectableRole = UserRole.DJ | UserRole.PLANNER | UserRole.MUSIC_LOVER;

interface RegisterResponse {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    onboardingCompleted: boolean;
  };
}

const roleOptions: Array<{
  role: SelectableRole;
  title: string;
  subtitle: string;
}> = [
  {
    role: UserRole.DJ,
    title: 'DJ',
    subtitle: 'Show your sound, pricing, and vibe tags.',
  },
  {
    role: UserRole.PLANNER,
    title: 'Organizer',
    subtitle: 'Book talent for events and venues.',
  },
  {
    role: UserRole.MUSIC_LOVER,
    title: 'Fan',
    subtitle: 'Follow DJs and discover new vibes.',
  },
];

export default function RegisterPage() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);

  const [selectedRole, setSelectedRole] = useState<SelectableRole>(UserRole.DJ);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const apiBaseUrl = useMemo(() => {
    const envBase = process.env.NEXT_PUBLIC_API_URL?.trim();
    return envBase && envBase.length > 0 ? envBase : 'http://localhost:3001';
  }, []);

  const validateForm = (): string | null => {
    if (!email.trim()) return 'Email is required.';
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return 'Enter a valid email address.';
    if (password.length < 8) return 'Password must be at least 8 characters.';
    if (password !== confirmPassword) return 'Passwords do not match.';
    return null;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    const validationError = validateForm();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`${apiBaseUrl}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          role: selectedRole,
        }),
      });

      const payload = (await response.json()) as Partial<RegisterResponse> & { message?: string };

      if (!response.ok || !payload.user || !payload.token) {
        setErrorMessage(payload.message ?? 'Registration failed. Please try again.');
        return;
      }

      login({
        user: payload.user,
        token: payload.token,
      });
      document.cookie = `mixmatch_auth_token=${encodeURIComponent(payload.token)}; Path=/; SameSite=Lax`;

      router.push('/onboarding');
    } catch {
      setErrorMessage('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-10 sm:px-6 lg:px-8">
      <section className="mx-auto w-full max-w-2xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
        <header>
          <h1 className="text-2xl font-semibold text-zinc-900">Create your MixMatch account</h1>
          <p className="mt-1 text-sm text-zinc-600">Pick your role and get started with onboarding.</p>
        </header>

        <form className="mt-6 space-y-5" onSubmit={handleSubmit} noValidate>
          <div>
            <p className="mb-2 text-sm font-medium text-zinc-800">Select role</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {roleOptions.map((option) => {
                const isActive = option.role === selectedRole;

                return (
                  <button
                    key={option.role}
                    type="button"
                    onClick={() => setSelectedRole(option.role)}
                    className={`rounded-xl border p-4 text-left transition ${
                      isActive
                        ? 'border-zinc-900 bg-zinc-900 text-white'
                        : 'border-zinc-300 bg-white text-zinc-900 hover:border-zinc-500'
                    }`}
                    aria-pressed={isActive}
                  >
                    <p className="text-sm font-semibold">{option.title}</p>
                    <p className={`mt-1 text-xs ${isActive ? 'text-zinc-200' : 'text-zinc-600'}`}>
                      {option.subtitle}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-zinc-800">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-medium text-zinc-800">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium text-zinc-800">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500"
              />
            </div>
          </div>

          {errorMessage ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Creating account...' : 'Create account'}
          </button>
        </form>
      </section>
    </main>
  );
}
