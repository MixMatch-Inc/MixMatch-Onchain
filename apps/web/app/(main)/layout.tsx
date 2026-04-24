'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { AppShell } from '@/components/app-shell';

export default function MainGroupLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    if (user && !user.onboardingCompleted) {
      router.replace('/onboarding');
    }
  }, [isAuthenticated, user, router]);

  if (!isAuthenticated) return null;

  return <AppShell>{children}</AppShell>;
}
