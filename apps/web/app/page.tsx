'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '../lib/useAuth';

export default function Home() {
  const router = useRouter();
  const { accessToken, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    router.replace(accessToken ? '/anchor' : '/login');
  }, [isLoading, accessToken, router]);

  return null;
}
