'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '../lib/useAuth';

/** Sends signed-in visitors on to the app; everyone else keeps seeing the landing page. */
export function AuthRedirect() {
  const router = useRouter();
  const { accessToken, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && accessToken) router.replace('/payments');
  }, [isLoading, accessToken, router]);

  return null;
}
