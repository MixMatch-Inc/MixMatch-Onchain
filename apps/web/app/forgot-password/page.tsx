'use client';

import { TextField } from '@repo/ui/text-field';
import Link from 'next/link';
import { useState } from 'react';
import { forgotPassword } from '../../lib/security-client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <main className="page page--narrow">
      <h1>Forgot password</h1>
      <form
        className="stack"
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          void forgotPassword({ email })
            .then((result) => setMessage(result.message))
            .catch((err) => setError(err instanceof Error ? err.message : 'Could not send reset link'));
        }}
      >
        {error ? <p className="error-text">{error}</p> : null}
        {message ? <p role="status">{message}</p> : null}
        <TextField label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        <button type="submit" className="btn btn--primary">Send reset link</button>
      </form>
      <Link href="/login">Back to sign in</Link>
    </main>
  );
}
