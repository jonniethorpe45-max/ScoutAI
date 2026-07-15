'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { EmptyState, ProgressBar, StatusBadge } from '@scoutai/ui';
import { AthleteNav } from '@/components/AthleteNav';
import {
  ApiError,
  getCompleteness,
  getMe,
  getMyAthlete,
  type AthleteOwnerView,
  type CompletenessResult,
} from '@/lib/api';

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export default function AthleteDashboardPage() {
  const router = useRouter();
  const [athlete, setAthlete] = useState<AthleteOwnerView | null>(null);
  const [completeness, setCompleteness] = useState<CompletenessResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        await getMe();
        const [profile, complete] = await Promise.all([getMyAthlete(), getCompleteness()]);
        if (cancelled) {
          return;
        }
        setAthlete(profile);
        setCompleteness(complete);
      } catch (err) {
        if (cancelled) {
          return;
        }
        if (err instanceof ApiError && err.status === 401) {
          router.replace('/sign-in');
          return;
        }
        if (err instanceof ApiError && err.status === 404) {
          router.replace('/app/athlete/onboarding');
          return;
        }
        setError(err instanceof ApiError ? err.message : 'Unable to load athlete dashboard.');
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const primarySport = useMemo(
    () => athlete?.sports.find((sport) => sport.isPrimary) ?? athlete?.sports[0],
    [athlete],
  );
  const primaryPosition = useMemo(
    () => athlete?.positions.find((position) => position.isPrimary) ?? athlete?.positions[0],
    [athlete],
  );
  const recommendations = useMemo(
    () => completeness?.checks.filter((check) => !check.satisfied).map((check) => check.label) ?? [],
    [completeness],
  );
  const isPublished = athlete?.profileStatus === 'PUBLISHED';

  if (error) {
    return (
      <main className="wideMain">
        <div className="card">
          <p className="error">{error}</p>
          <Link href="/app">Back to app</Link>
        </div>
      </main>
    );
  }

  if (!athlete || !completeness) {
    return (
      <main className="wideMain">
        <div className="card">
          <p>Loading athlete dashboard…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="wideMain">
      <AthleteNav />
      <div className="sectionBlock">
        <div className="inlineMeta">
          <div className="avatarPlaceholder" aria-hidden>
            {initials(athlete.displayName || 'A')}
          </div>
          <div>
            <p className="brand" style={{ margin: 0, fontSize: '1.35rem' }}>
              ScoutAI
            </p>
            <h1 style={{ marginBottom: '0.35rem' }}>{athlete.displayName}</h1>
            <div className="inlineMeta">
              <StatusBadge status={athlete.profileStatus} />
              <StatusBadge status={athlete.profileVisibility} />
            </div>
          </div>
        </div>

        <ProgressBar
          value={completeness.score}
          label={`Profile completeness · ${completeness.score}%`}
          style={{ marginTop: '1rem' }}
        />
      </div>

      <div className="sectionBlock">
        <h2>Passport summary</h2>
        <ul className="metaList">
          <li>
            <span className="metaLabel">Sport</span>
            <span className="metaValue">{primarySport?.sportName ?? 'Not set'}</span>
          </li>
          <li>
            <span className="metaLabel">Primary position</span>
            <span className="metaValue">{primaryPosition?.name ?? 'Not set'}</span>
          </li>
          <li>
            <span className="metaLabel">Visibility</span>
            <span className="metaValue">{athlete.profileVisibility}</span>
          </li>
          <li>
            <span className="metaLabel">Onboarding</span>
            <span className="metaValue">{athlete.onboardingStage}</span>
          </li>
        </ul>
        {isPublished ? (
          <p className="mutedNote" style={{ marginTop: '1rem' }}>
            Public link:{' '}
            <Link href={`/athletes/${athlete.slug}`}>/athletes/{athlete.slug}</Link>
          </p>
        ) : (
          <p className="mutedNote" style={{ marginTop: '1rem' }}>
            Publish from Settings when readiness checks pass.
          </p>
        )}
      </div>

      <div className="sectionBlock">
        <h2>Recommendations</h2>
        {recommendations.length === 0 ? (
          <EmptyState
            title="Looking good"
            description="Required publish checks are complete. Optional fields can still strengthen your Passport."
          />
        ) : (
          <ul className="recommendList">
            {recommendations.map((item) => (
              <li key={item}>Complete: {item}</li>
            ))}
          </ul>
        )}
        <div className="actions">
          <Link className="button buttonPrimary" href="/app/athlete/onboarding">
            Continue onboarding
          </Link>
          <Link className="button buttonSecondary" href="/app/athlete/passport">
            Edit Passport
          </Link>
          {isPublished ? (
            <>
              <Link className="button buttonSecondary" href="/app/athlete/games">
                Games
              </Link>
              <Link className="button buttonSecondary" href="/app/athlete/performance">
                Performance
              </Link>
            </>
          ) : null}
          <Link className="button buttonSecondary" href="/app/athlete/settings">
            Settings
          </Link>
        </div>
      </div>
    </main>
  );
}
