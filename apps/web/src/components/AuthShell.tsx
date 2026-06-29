'use client';

import type { ReactNode } from 'react';
import { useAuth } from '@/lib/auth-context';

export interface AuthShellProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function AuthShell({ children, fallback }: AuthShellProps) {
  const { isLoading } = useAuth();

  if (isLoading) {
    return fallback ?? (
      <main aria-label="Loading authentication">
        <p>Loading...</p>
      </main>
    );
  }

  return <>{children}</>;
}
