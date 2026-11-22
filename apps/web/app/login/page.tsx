'use client';

import { loginSchema, registerSchema } from '@mixmatch/shared';
import { TextField } from '@repo/ui/text-field';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { loginUser, registerUser } from '../../lib/auth-client';
import { LanguageSwitcher } from '../../components/LanguageSwitcher';
import { useT } from '../../lib/i18n';
import { ThemeToggle } from '../../components/ThemeToggle';
import { useAuth } from '../../lib/useAuth';

type Mode = 'login' | 'register';

export default function LoginPage() {
  const router = useRouter();
  const { t } = useT();
  const { setAuth } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      router.push(mode === 'register' ? '/onboarding' : '/payments');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.somethingWrong'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main style={{ maxWidth: 360, margin: '80px auto', padding: '0 16px', fontFamily: 'sans-serif' }}>
      <LanguageSwitcher />
      <h1>{t('common.appName')}</h1>
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <button type="button" onClick={() => setMode('login')} disabled={mode === 'login'}>
          {t('auth.logIn')}
        </button>
        <button type="button" onClick={() => setMode('register')} disabled={mode === 'register'}>
          {t('auth.register')}
        </button>
      </div>
      <form onSubmit={(event) => void handleSubmit(event)}>
        <label style={{ display: 'block', marginBottom: 12 }}>
          {t('auth.email')}
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            style={{ display: 'block', width: '100%', padding: 8, marginTop: 4 }}
            data-testid="email-input"
          />
        </label>
        <label style={{ display: 'block', marginBottom: 12 }}>
          {t('auth.password')}
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            style={{ display: 'block', width: '100%', padding: 8, marginTop: 4 }}
            data-testid="password-input"
          />
        </label>
        {error && <p style={{ color: 'crimson' }}>{error}</p>}
        <button type="submit" disabled={isSubmitting} data-testid="submit-button">
          {mode === 'login' ? t('auth.logIn') : t('auth.register')}
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
      <p><Link href="/forgot-password">Forgot your password?</Link></p>
    </main>
  );
}
