'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getCreatorDashboard } from '../../lib/profile-client';
import { useAuth } from '../../lib/useAuth';

/** Creator dashboard shell: earnings and tips received (#1379). */
export default function DashboardPage() {
  const router = useRouter();
  const { accessToken, isLoading } = useAuth();
  const [dashboard, setDashboard] = useState<Awaited<ReturnType<typeof getCreatorDashboard>>['dashboard'] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!isLoading && !accessToken) router.push('/login');
  }, [isLoading, accessToken, router]);

  useEffect(() => {
    if (!accessToken) return;
    getCreatorDashboard(accessToken)
      .then(({ dashboard: data }) => setDashboard(data))
      .catch(() => setError(true));
  }, [accessToken]);

  if (isLoading || !accessToken) return null;

  return (
    <main className="page">
      <div className="row row--between">
        <h1>Creator dashboard</h1>
        <nav className="row" aria-label="Account">
          <Link href="/profile">Profile</Link>
          <Link href="/payments">Payments</Link>
        </nav>
      </div>

      {error && <p className="error-text" role="alert">Could not load dashboard data.</p>}
      <div className="row" data-testid="creator-dashboard">
        <section className="card" style={{ flex: 1 }}>
          <h2>Earnings</h2>
          <p style={{ fontSize: '1.5rem' }}>{dashboard?.totalEarnings ?? '—'} XLM</p>
        </section>
        <section className="card" style={{ flex: 1 }}>
          <h2>Tips received</h2>
          <p style={{ fontSize: '1.5rem' }}>{dashboard?.tipsReceived ?? '—'}</p>
        </section>
      </div>

      <h2>Tip history</h2>
      {!dashboard || dashboard.tips.length === 0 ? <p>No tips yet.</p> : null}
      <ul className="list-reset">
        {dashboard?.tips.map((tip) => (
          <li key={tip.id} className="card" style={{ marginBottom: 8 }}>
            <strong>{tip.amount} XLM</strong> <span className="muted">{tip.memo}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}
