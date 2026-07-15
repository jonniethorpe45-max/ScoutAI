'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ApiError, getAthleteProfile, type AthleteProfileView } from '@/lib/api';

export default function AthletePublicPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [view, setView] = useState<AthleteProfileView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const result = await getAthleteProfile(params.id);
        if (!cancelled) setView(result);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          router.replace('/sign-in');
          return;
        }
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Unable to load athlete');
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [params.id, router]);

  if (!view && !error) {
    return (
      <main>
        <div className="card">
          <p>Loading athlete…</p>
        </div>
      </main>
    );
  }

  return (
    <main>
      <div className="card">
        <p className="brand">ScoutAI</p>
        <h1>{view?.profile.displayName ?? 'Athlete'}</h1>
        <p>Access level: {view?.access ?? '—'}</p>
        {error ? <p className="error">{error}</p> : null}
        {view ? (
          <ul className="metaList">
            <li>
              <span className="metaLabel">Sport</span>
              <span className="metaValue">{view.profile.sport}</span>
            </li>
            <li>
              <span className="metaLabel">Position</span>
              <span className="metaValue">{view.profile.position ?? '—'}</span>
            </li>
            <li>
              <span className="metaLabel">Class</span>
              <span className="metaValue">{view.profile.graduationYear ?? '—'}</span>
            </li>
            <li>
              <span className="metaLabel">School</span>
              <span className="metaValue">{view.profile.highSchoolName ?? '—'}</span>
            </li>
            {'contactEmail' in view.profile ? (
              <li>
                <span className="metaLabel">Contact email</span>
                <span className="metaValue">{view.profile.contactEmail ?? '—'}</span>
              </li>
            ) : null}
          </ul>
        ) : null}
        <div className="actions">
          <Link className="button buttonSecondary" href="/app">
            Back
          </Link>
        </div>
      </div>
    </main>
  );
}
