'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getCurrentProfile } from '../../lib/profile-client';
import { useAuth } from '../../lib/useAuth';

/** Read-only profile view backed by GET /api/users/me (#1381). */
export default function ProfilePage() {
  const router = useRouter();
  const { accessToken, isLoading } = useAuth();
  const [profile, setProfile] = useState<Awaited<ReturnType<typeof getCurrentProfile>>['user'] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!isLoading && !accessToken) router.push('/login');
  }, [isLoading, accessToken, router]);

  useEffect(() => {
    if (!accessToken) return;
    getCurrentProfile(accessToken)
      .then(({ user }) => setProfile(user))
      .catch(() => setError(true));
  }, [accessToken]);

  if (isLoading || !accessToken) return null;

  return (
    <main className="page">
      <div className="row row--between">
        <h1>Your profile</h1>
        <nav className="row" aria-label="Account">
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/creators">Creators</Link>
          <Link href="/payments">Payments</Link>
        </nav>
      </div>

      {error && <p className="error-text" role="alert">Could not load your profile.</p>}
      {!error && !profile && <p>Loading…</p>}
      {profile && (
        <section className="card stack" data-testid="profile-view">
          <div className="row">
            {profile.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatarUrl} alt="" width={56} height={56} style={{ borderRadius: '50%' }} />
            ) : (
              <div className="card" aria-hidden="true">{(profile.displayName ?? profile.email).slice(0, 2).toUpperCase()}</div>
            )}
            <div>
              <strong style={{ fontSize: '1.25rem' }}>{profile.displayName ?? profile.email}</strong>
              <p className="muted">{profile.email}</p>
            </div>
          </div>
          {profile.bio ? <p>{profile.bio}</p> : <p className="muted">No bio yet.</p>}
          <p className="muted">Role: {profile.role}</p>
        </section>
      )}
    </main>
  );
}
