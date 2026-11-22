'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { verifyEmail } from '../../lib/security-client';

export default function VerifyEmailPage() {
  const [message, setMessage] = useState('Verifying…');
  const [error, setError] = useState(false);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token');
    if (!token) {
      setMessage('No verification token was provided.');
      setError(true);
      return;
    }
    void verifyEmail(token)
      .then((result) => setMessage(result.message))
      .catch((err) => {
        setMessage(err instanceof Error ? err.message : 'Could not verify email');
        setError(true);
      });
  }, []);

  return (
    <main className="page page--narrow">
      <h1>Email verification</h1>
      <p className={error ? 'error-text' : 'muted'} role="status">{message}</p>
      <Link href="/payments">Go to payments</Link>
    </main>
  );
}
