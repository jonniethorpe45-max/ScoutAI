'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  ApiError,
  getOrganizationRoster,
  listMyOrganizations,
  type OrganizationSummary,
  type RosterMember,
} from '@/lib/api';

export default function OrganizationRosterPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [org, setOrg] = useState<OrganizationSummary | null>(null);
  const [roster, setRoster] = useState<RosterMember[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [orgs, members] = await Promise.all([
          listMyOrganizations(),
          getOrganizationRoster(params.id),
        ]);
        if (cancelled) return;
        setOrg(orgs.find((item) => item.id === params.id) ?? null);
        setRoster(members);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          router.replace('/sign-in');
          return;
        }
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Unable to load roster');
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [params.id, router]);

  return (
    <main>
      <div className="card">
        <p className="brand">ScoutAI</p>
        <h1>{org?.name ?? 'Organization roster'}</h1>
        <p>Coach and org-admin roster view within organization boundaries.</p>
        {error ? <p className="error">{error}</p> : null}
        <ul className="metaList">
          {roster.map((member) => (
            <li key={member.id}>
              <span className="metaLabel">
                {member.displayName ?? member.email} · {member.role}
              </span>
              <span className="metaValue">
                {member.athleteId ? (
                  <Link href={`/app/athletes/${member.athleteId}`}>Profile</Link>
                ) : (
                  member.status
                )}
              </span>
            </li>
          ))}
        </ul>
        <div className="actions">
          <Link className="button buttonSecondary" href="/app">
            Back
          </Link>
        </div>
      </div>
    </main>
  );
}
