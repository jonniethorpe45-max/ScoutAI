'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ApiError, getHealth, getMe, getReady, type AuthUser } from '@/lib/api';

interface StatusState {
  health: string;
  ready: string;
}

export default function AppDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<StatusState>({ health: 'loading', ready: 'loading' });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const me = await getMe();
        if (cancelled) {
          return;
        }

        const isAthlete = me.roles.includes('ATHLETE');
        if (isAthlete) {
          router.replace('/app/athlete/dashboard');
          return;
        }

        setUser(me);

        const [health, ready] = await Promise.all([
          getHealth().catch(() => ({ status: 'unreachable' })),
          getReady().catch(() => ({ status: 'unreachable' })),
        ]);

        if (cancelled) {
          return;
        }

        setStatus({
          health: health.status,
          ready: ready.status,
        });
      } catch (err) {
        if (cancelled) {
          return;
        }
        if (err instanceof ApiError && err.status === 401) {
          router.replace('/sign-in');
          return;
        }
        if (err instanceof ApiError && err.status === 403) {
          router.replace('/unauthorized');
          return;
        }
        setError('Unable to load dashboard. Ensure the API is running.');
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const environment = process.env.NEXT_PUBLIC_NODE_ENV ?? process.env.NODE_ENV ?? 'development';

  function statusClass(value: string): string {
    return value === 'ok' || value === 'ready' ? 'statusOk' : 'statusBad';
  }

  if (!user && !error) {
    return (
      <main>
        <div className="card">
          <p>Loading dashboard…</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main>
        <div className="card">
          <p className="error">{error}</p>
          <Link href="/sign-in">Back to sign in</Link>
        </div>
      </main>
    );
  }

  return (
    <main>
      <div className="card">
        <p className="brand">ScoutAI</p>
        <h1>Dashboard</h1>
        <p>Authenticated foundation view. Athlete modules are available when you have an athlete profile.</p>

        <ul className="metaList">
          <li>
            <span className="metaLabel">Email</span>
            <span className="metaValue">{user?.email}</span>
          </li>
          <li>
            <span className="metaLabel">Roles</span>
            <span className="metaValue">{user?.roles.join(', ') || '—'}</span>
          </li>
          <li>
            <span className="metaLabel">Environment</span>
            <span className="metaValue">{environment}</span>
          </li>
          <li>
            <span className="metaLabel">API health</span>
            <span className={`metaValue ${statusClass(status.health)}`}>{status.health}</span>
          </li>
          <li>
            <span className="metaLabel">API ready</span>
            <span className={`metaValue ${statusClass(status.ready)}`}>{status.ready}</span>
          </li>
        </ul>

        <div className="sectionBlock" style={{ marginTop: '1.25rem' }}>
          <h2>Athlete Passport</h2>
          <p>
            Create an Athlete Passport to start onboarding. New accounts without roles receive ATHLETE
            when creating a profile.
          </p>
          <div className="actions" style={{ marginTop: '0.75rem' }}>
            <Link className="button buttonPrimary" href="/app/athlete/onboarding">
              Start athlete onboarding
            </Link>
            <Link className="button buttonSecondary" href="/app/athlete/dashboard">
              Athlete dashboard
            </Link>
          </div>
        </div>

        <div className="actions">
          <Link className="button buttonSecondary" href="/">
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
