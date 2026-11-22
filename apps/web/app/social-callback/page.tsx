'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { completeSocialLogin } from '../../lib/settings-client';
import type { SocialProvider } from '@mixmatch/shared';
import { useAuth } from '../../lib/useAuth';

export default function SocialCallbackPage() {
  const router = useRouter();
  const { accessToken, isLoading, setAuth } = useAuth();
  const [message, setMessage] = useState('Completing sign in…');

  useEffect(() => {
    if (isLoading) return;
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    const provider = window.sessionStorage.getItem('mixmatch.social.provider') as SocialProvider | null;
    const expectedState = window.sessionStorage.getItem('mixmatch.social.state');

    if (!code || !state || !provider || state !== expectedState) {
      setMessage('Invalid social login response.');
      return;
    }

    const linking = window.sessionStorage.getItem('mixmatch.social.link') === 'true';
    void completeSocialLogin(provider, code, state, linking ? accessToken ?? undefined : undefined)
      .then(() => {
        window.sessionStorage.removeItem('mixmatch.social.link');
        router.replace(linking ? '/settings' : '/payments');
      })
      .catch((err) => setMessage(err instanceof Error ? err.message : 'Could not sign in'));
  }, [accessToken, isLoading, router, setAuth]);

  return (
    <main className="page page--narrow">
      <h1>Social sign in</h1>
      <p role="status">{message}</p>
    </main>
  );
}
