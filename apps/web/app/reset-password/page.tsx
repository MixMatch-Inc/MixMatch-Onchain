'use client';

import { TextField } from '@repo/ui/text-field';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { resetPassword } from '../../lib/security-client';

export default function ResetPasswordPage() {
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get('token');
    if (value) setToken(value);
  }, []);

  return (
    <main className="page page--narrow">
      <h1>Reset password</h1>
      <form
        className="stack"
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          void resetPassword({ token, newPassword: password })
            .then((result) => setMessage(result.message))
            .catch((err) => setError(err instanceof Error ? err.message : 'Could not reset password'));
        }}
      >
        {error ? <p className="error-text">{error}</p> : null}
        {message ? <p role="status">{message}</p> : null}
        <TextField label="Reset token" value={token} onChange={(event) => setToken(event.target.value)} />
        <TextField label="New password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        <button type="submit" className="btn btn--primary">Reset password</button>
      </form>
      <Link href="/login">Back to sign in</Link>
    </main>
  );
}
