'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  ApiError,
  getHealth,
  getMe,
  getMyAthleteProfile,
  getReady,
  listGuardianAthletes,
  listGuardianLinks,
  listMyOrganizations,
  type AthleteProfileView,
  type AuthUser,
  type GuardianLink,
  type OrganizationSummary,
} from '@/lib/api';

export default function AppDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<AthleteProfileView | null>(null);
  const [links, setLinks] = useState<GuardianLink[]>([]);
  const [linkedAthletes, setLinkedAthletes] = useState<
    Array<{ link: GuardianLink; athlete: { id: string; displayName: string } }>
  >([]);
  const [orgs, setOrgs] = useState<OrganizationSummary[]>([]);
  const [status, setStatus] = useState({ health: 'loading', ready: 'loading' });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const me = await getMe();
        if (cancelled) return;
        setUser(me);

        const [health, ready] = await Promise.all([
          getHealth().catch(() => ({ status: 'unreachable' })),
          getReady().catch(() => ({ status: 'unreachable' })),
        ]);
        if (cancelled) return;
        setStatus({ health: health.status, ready: ready.status });

        if (me.roles.includes('ATHLETE')) {
          try {
            const mine = await getMyAthleteProfile();
            if (!cancelled) setProfile(mine);
          } catch (err) {
            if (!(err instanceof ApiError && err.status === 404) && !cancelled) {
              setProfile(null);
            }
          }
        }

        try {
          const [guardianLinks, athletes, organizations] = await Promise.all([
            listGuardianLinks().catch(() => []),
            listGuardianAthletes().catch(() => []),
            listMyOrganizations().catch(() => []),
          ]);
          if (cancelled) return;
          setLinks(guardianLinks);
          setLinkedAthletes(athletes);
          setOrgs(organizations);
        } catch {
          // non-fatal for dashboard shell
        }
      } catch (err) {
        if (cancelled) return;
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

  const isAthlete = user?.roles.includes('ATHLETE');
  const isGuardian = user?.roles.includes('GUARDIAN');
  const isCoachOrAdmin =
    user?.roles.includes('COACH') || user?.roles.includes('ORGANIZATION_ADMIN');

  return (
    <main>
      <div className="card">
        <p className="brand">ScoutAI</p>
        <h1>Athlete platform</h1>
        <p className="subtitle">Stage 4 foundation — profile, guardians, and org roster.</p>

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
            <span className="metaLabel">API health</span>
            <span className={`metaValue ${statusClass(status.health)}`}>{status.health}</span>
          </li>
          <li>
            <span className="metaLabel">API ready</span>
            <span className={`metaValue ${statusClass(status.ready)}`}>{status.ready}</span>
          </li>
        </ul>

        {isAthlete ? (
          <section className="sectionBlock">
            <h2>Your athlete profile</h2>
            {profile ? (
              <ul className="metaList">
                <li>
                  <span className="metaLabel">Name</span>
                  <span className="metaValue">{profile.profile.displayName}</span>
                </li>
                <li>
                  <span className="metaLabel">Sport / position</span>
                  <span className="metaValue">
                    {profile.profile.sport}
                    {profile.profile.position ? ` · ${profile.profile.position}` : ''}
                  </span>
                </li>
                <li>
                  <span className="metaLabel">Class</span>
                  <span className="metaValue">{profile.profile.graduationYear ?? '—'}</span>
                </li>
              </ul>
            ) : (
              <p>No profile yet. Create one to unlock guardian invites.</p>
            )}
            <div className="actions">
              <Link className="button buttonPrimary" href="/app/profile">
                {profile ? 'Edit profile' : 'Create profile'}
              </Link>
              <Link className="button buttonSecondary" href="/app/guardians">
                Manage guardians
              </Link>
            </div>
          </section>
        ) : null}

        {isGuardian ? (
          <section className="sectionBlock">
            <h2>Linked athletes</h2>
            {linkedAthletes.length === 0 ? (
              <p>No active guardian links yet. Accept an invite from an athlete.</p>
            ) : (
              <ul className="metaList">
                {linkedAthletes.map((entry) => (
                  <li key={entry.link.id}>
                    <span className="metaLabel">{entry.athlete.displayName}</span>
                    <span className="metaValue">
                      <Link href={`/app/athletes/${entry.athlete.id}`}>View profile</Link>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <div className="actions">
              <Link className="button buttonSecondary" href="/app/guardians">
                Guardian links
              </Link>
            </div>
          </section>
        ) : null}

        {isCoachOrAdmin && orgs.length > 0 ? (
          <section className="sectionBlock">
            <h2>Organizations</h2>
            <ul className="metaList">
              {orgs.map((org) => (
                <li key={org.id}>
                  <span className="metaLabel">{org.name}</span>
                  <span className="metaValue">
                    <Link href={`/app/organizations/${org.id}`}>Roster</Link>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {links.length > 0 && isAthlete ? (
          <section className="sectionBlock">
            <h2>Guardian link status</h2>
            <ul className="metaList">
              {links.map((link) => (
                <li key={link.id}>
                  <span className="metaLabel">{link.relationshipType}</span>
                  <span className="metaValue">{link.status}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <div className="actions">
          <Link className="button buttonSecondary" href="/">
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
