'use client';

import type { LinkedAccount, UserSettings } from '@mixmatch/shared';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  disconnectLinkedAccount,
  getSettings,
  getSocialAuthUrl,
  listLinkedAccounts,
  updateSettings,
} from '../../lib/settings-client';
import { useAuth } from '../../lib/useAuth';

export default function SettingsPage() {
  const { accessToken } = useAuth();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [accounts, setAccounts] = useState<LinkedAccount[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    void getSettings(accessToken)
      .then(setSettings)
      .catch(() => setMessage('Could not load settings.'));
    void listLinkedAccounts(accessToken)
      .then(setAccounts)
      .catch(() => setMessage('Could not load linked accounts.'));
  }, [accessToken]);

  const linkProvider = async (provider: 'google' | 'apple') => {
    try {
      const { url, state } = await getSocialAuthUrl(provider);
      window.sessionStorage.setItem('mixmatch.social.provider', provider);
      window.sessionStorage.setItem('mixmatch.social.state', state);
      window.sessionStorage.setItem('mixmatch.social.link', 'true');
      window.location.assign(url);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not link provider.');
    }
  };

  const save = async (next: UserSettings) => {
    if (!accessToken) return;
    setSettings(next);
    try {
      setSettings(await updateSettings(next, accessToken));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not save settings.');
    }
  };

  return (
    <main className="page page--narrow">
      <h1>Settings</h1>
      {message ? <p className="error-text">{message}</p> : null}
      {settings ? (
        <div className="stack">
          <label>
            Network
            <select
              value={settings.network}
              onChange={(event) => void save({ ...settings, network: event.target.value as UserSettings['network'] })}
            >
              <option value="testnet">Testnet</option>
              <option value="public">Public</option>
            </select>
          </label>
          <label>
            Display currency
            <select
              value={settings.displayCurrency}
              onChange={(event) => void save({ ...settings, displayCurrency: event.target.value })}
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="NGN">NGN</option>
            </select>
          </label>
          <label>
            Language
            <select
              value={settings.language}
              onChange={(event) => void save({ ...settings, language: event.target.value })}
            >
              <option value="en">English</option>
              <option value="fr">Français</option>
              <option value="ar">العربية</option>
            </select>
          </label>
          {(Object.keys(settings.notificationPreferences) as (keyof UserSettings['notificationPreferences'])[]).map((key) => (
            <label key={key} style={{ display: 'flex', gap: 8 }}>
              <input
                type="checkbox"
                checked={settings.notificationPreferences[key]}
                onChange={(event) =>
                  void save({
                    ...settings,
                    notificationPreferences: { ...settings.notificationPreferences, [key]: event.target.checked },
                  })
                }
              />
              {key}
            </label>
          ))}
        </div>
      ) : null}

      <h2>Linked accounts</h2>
      <div className="stack">
        <button type="button" onClick={() => void linkProvider('google')}>Link Google</button>
        <button type="button" onClick={() => void linkProvider('apple')}>Link Apple</button>
        {accounts.length === 0 ? <p className="muted">No linked accounts.</p> : null}
        {accounts.map((account) => (
          <div className="row row--between" key={account.id}>
            <span>
              {account.provider}: {account.label}
              <br />
              <small>Last sync: {account.lastSyncAt ? new Date(account.lastSyncAt).toLocaleString() : 'unknown'}</small>
            </span>
            <button
              type="button"
              onClick={() => {
                if (!accessToken) return;
                void disconnectLinkedAccount(account.id, accessToken).then(() =>
                  setAccounts((prev) => prev.filter((item) => item.id !== account.id)),
                );
              }}
            >
              Disconnect
            </button>
          </div>
        ))}
      </div>

      <h2>Legal</h2>
      <div className="stack">
        <Link href="/terms">Terms of service</Link>
        <Link href="/privacy">Privacy policy</Link>
      </div>
      <Link href="/payments">Back to payments</Link>
    </main>
  );
}
