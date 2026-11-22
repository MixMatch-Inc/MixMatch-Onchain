'use client';

import type { NotificationPreferences } from '@mixmatch/shared';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getNotificationPreferences, updateNotificationPreferences } from '../../lib/security-client';
import { useAuth } from '../../lib/useAuth';

export default function NotificationPreferencesPage() {
  const { accessToken } = useAuth();
  const [prefs, setPrefs] = useState<NotificationPreferences>({ payments: true, matches: true, marketing: false });
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    void getNotificationPreferences(accessToken)
      .then(setPrefs)
      .catch(() => setMessage('Could not load notification preferences.'));
  }, [accessToken]);

  const toggle = (key: keyof NotificationPreferences) => {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    if (accessToken) {
      void updateNotificationPreferences(next, accessToken)
        .then(setPrefs)
        .catch(() => setMessage('Could not save notification preferences.'));
    }
  };

  return (
    <main className="page page--narrow">
      <h1>Notification preferences</h1>
      {message ? <p className="error-text">{message}</p> : null}
      <div className="stack">
        {(Object.keys(prefs) as (keyof NotificationPreferences)[]).map((key) => (
          <label key={key} style={{ display: 'flex', gap: 8 }}>
            <input type="checkbox" checked={prefs[key]} onChange={() => toggle(key)} />
            {key[0].toUpperCase() + key.slice(1)} notifications
          </label>
        ))}
      </div>
      <Link href="/payments">Back to payments</Link>
    </main>
  );
}
