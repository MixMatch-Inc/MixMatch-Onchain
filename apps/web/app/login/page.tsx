'use client';

import { loginSchema, registerSchema } from '@mixmatch/shared';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { loginUser, registerUser } from '../../lib/auth-client';
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
      if (auth.accessToken === null) {
        // The API requires a confirmed email address, so no session is
        // issued yet — the user has to follow the link they were sent.
        setError('Check your email to confirm your address, then log in.');
        setMode('login');
        return;
      }
      setAuth(auth);
      router.push('/anchor');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main style={{ maxWidth: 360, margin: '80px auto', padding: '0 16px', fontFamily: 'sans-serif' }}>
      <h1>MixMatch Onchain</h1>
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <button type="button" onClick={() => setMode('login')} disabled={mode === 'login'}>
          Log in
        </button>
        <button type="button" onClick={() => setMode('register')} disabled={mode === 'register'}>
          Register
        </button>
      </div>
      <form onSubmit={(event) => void handleSubmit(event)}>
        <label style={{ display: 'block', marginBottom: 12 }}>
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            style={{ display: 'block', width: '100%', padding: 8, marginTop: 4 }}
            data-testid="email-input"
          />
        </label>
        <label style={{ display: 'block', marginBottom: 12 }}>
          Password
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
          {mode === 'login' ? 'Log in' : 'Register'}
        </button>
      </form>
    </main>
  );
}
