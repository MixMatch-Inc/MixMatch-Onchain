import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AuthProvider } from '@/lib/auth-context';
import { AuthShell } from '../AuthShell';

describe('AuthShell', () => {
  it('renders children after auth state resolves', async () => {
    render(
      <AuthProvider>
        <AuthShell>
          <p>Authenticated content</p>
        </AuthShell>
      </AuthProvider>,
    );

    expect(await screen.findByText('Authenticated content')).toBeInTheDocument();
  });

  it('renders custom fallback when provided', async () => {
    render(
      <AuthProvider>
        <AuthShell fallback={<p>Custom loader...</p>}>
          <p>Content</p>
        </AuthShell>
      </AuthProvider>,
    );

    expect(await screen.findByText('Content')).toBeInTheDocument();
  });
});
