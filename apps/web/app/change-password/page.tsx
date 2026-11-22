'use client';

import { TextField } from '@repo/ui/text-field';
import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '../../lib/useAuth';
import { changePassword } from '../../lib/security-client';

export default function ChangePasswordPage() {
  const { accessToken } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <main className="page page--narrow">
      <h1>Change password</h1>
      <form
        className="stack"
        onSubmit={(event) => {
          event.preventDefault();
          if (!accessToken) return;
          setError(null);
          void changePassword({ currentPassword, newPassword }, accessToken)
            .then((result) => {
              setMessage(result.message);
              setCurrentPassword('');
              setNewPassword('');
            })
            .catch((err) => setError(err instanceof Error ? err.message : 'Could not change password'));
        }}
      >
        {error ? <p className="error-text">{error}</p> : null}
        {message ? <p role="status">{message}</p> : null}
        <TextField label="Current password" type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
        <TextField label="New password" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
        <button type="submit" className="btn btn--primary">Change password</button>
      </form>
      <Link href="/payments">Back to payments</Link>
    </main>
  );
}
