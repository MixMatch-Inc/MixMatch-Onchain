'use client';

import { loginSchema, registerSchema } from '@mixmatch/shared';
import { TextField } from '@repo/ui/text-field';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { loginUser, registerUser } from '../../lib/auth-client';
import { getSocialAuthUrl } from '../../lib/settings-client';
import { ThemeToggle } from '../../components/ThemeToggle';
import { useAuth } from '../../lib/useAuth';

type Mode = 'login' | 'register';

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const startSocialLogin = async (provider: 'google' | 'apple') => {
    setError(null);
    try {
      const { url, state } = await getSocialAuthUrl(provider);
      window.sessionStorage.setItem('mixmatch.social.provider', provider);
      window.sessionStorage.setItem('mixmatch.social.state', state);
      window.sessionStorage.removeItem('mixmatch.social.link');
      window.location.assign(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start social login');
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const schema = mode === 'login' ? loginSchema : registerSchema;
    const result = schema.safeParse({ email, password });
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Invalid input');
      return;
    }

    setIsSubmitting(true);
    try {
      const auth = mode === 'login' ? await loginUser(result.data) : await registerUser(result.data);
      setAuth(auth);
      router.push('/payments');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="page page--narrow">
      <div className="row row--between">
        <h1>MixMatch Onchain</h1>
        <ThemeToggle />
      </div>
      <div className="row">
        <button type="button" className="btn" aria-pressed={mode === 'login'} onClick={() => setMode('login')}>
          Log in
        </button>
        <button type="button" className="btn" aria-pressed={mode === 'register'} onClick={() => setMode('register')}>
          Register
        </button>
      </div>
      <form className="stack" onSubmit={(event) => void handleSubmit(event)} noValidate>
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          data-testid="email-input"
        />
        <TextField
          label="Password"
          type="password"
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={error ?? undefined}
          data-testid="password-input"
        />
        <button type="submit" className="btn btn--primary" disabled={isSubmitting} data-testid="submit-button">
          {mode === 'login' ? 'Log in' : 'Register'}
        </button>
      </form>
      <div className="stack">
        <button type="button" className="btn" onClick={() => void startSocialLogin('google')}>Continue with Google</button>
        <button type="button" className="btn" onClick={() => void startSocialLogin('apple')}>Continue with Apple</button>
      </div>
    </main>
  );
}
