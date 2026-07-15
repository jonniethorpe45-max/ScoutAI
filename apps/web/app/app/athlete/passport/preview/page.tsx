'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { EmptyState, StatusBadge } from '@scoutai/ui';
import { AthleteNav } from '@/components/AthleteNav';
import {
  ApiError,
  getMe,
  getMyAthlete,
  getPublicAthlete,
  ownerToPublicPreview,
  type AthletePublicView,
} from '@/lib/api';

function PublicPassportView({
  view,
  previewMode,
}: {
  view: AthletePublicView;
  previewMode: boolean;
}) {
  const primarySport = view.sports.find((s) => s.isPrimary) ?? view.sports[0];
  const primaryPosition = view.positions.find((p) => p.isPrimary) ?? view.positions[0];

  return (
    <div className="stackGap">
      <div className="sectionBlock">
        <div className="inlineMeta">
          <div className="avatarPlaceholder" aria-hidden>
            {(view.displayName || 'A')
              .split(/\s+/)
              .slice(0, 2)
              .map((p) => p[0]?.toUpperCase() ?? '')
              .join('')}
          </div>
          <div>
            {previewMode ? <p className="mutedNote">Owner preview · public-shaped fields only</p> : null}
            <h1 style={{ marginBottom: '0.35rem' }}>{view.displayName}</h1>
            <div className="inlineMeta">
              <StatusBadge status={view.profileStatus} />
              <StatusBadge status={view.profileVisibility} />
            </div>
          </div>
        </div>
        <p>
          {[view.city, view.stateRegion, view.countryCode].filter(Boolean).join(', ') || 'Location not listed'}
        </p>
      </div>

      <div className="sectionBlock">
        <h2>Sport</h2>
        <ul className="metaList">
          <li>
            <span className="metaLabel">Sport</span>
            <span className="metaValue">{primarySport?.sportName ?? '—'}</span>
          </li>
          <li>
            <span className="metaLabel">Position</span>
            <span className="metaValue">{primaryPosition?.name ?? '—'}</span>
          </li>
          <li>
            <span className="metaLabel">School / team</span>
            <span className="metaValue">
              {[view.schoolNameReported, view.teamNameReported].filter(Boolean).join(' · ') || '—'}
            </span>
          </li>
        </ul>
      </div>

      <div className="sectionBlock">
        <h2>About</h2>
        {view.biography ? <p>{view.biography}</p> : <EmptyState title="No biography yet" />}
      </div>

      <div className="sectionBlock">
        <h2>Academic</h2>
        {view.academicProfile ? (
          <ul className="metaList">
            <li>
              <span className="metaLabel">School</span>
              <span className="metaValue">{view.academicProfile.schoolName ?? '—'}</span>
            </li>
            <li>
              <span className="metaLabel">Graduation year</span>
              <span className="metaValue">{view.academicProfile.graduationYear ?? '—'}</span>
            </li>
            <li>
              <span className="metaLabel">Intended major</span>
              <span className="metaValue">{view.academicProfile.intendedMajor ?? '—'}</span>
            </li>
          </ul>
        ) : (
          <EmptyState title="Academic details not listed" />
        )}
      </div>

      <div className="sectionBlock">
        <h2>Physical</h2>
        {view.physicalProfile &&
        (view.physicalProfile.heightCm != null || view.physicalProfile.weightKg != null) ? (
          <ul className="metaList">
            <li>
              <span className="metaLabel">Height</span>
              <span className="metaValue">
                {view.physicalProfile.heightCm != null ? `${view.physicalProfile.heightCm} cm` : '—'}
              </span>
            </li>
            <li>
              <span className="metaLabel">Weight</span>
              <span className="metaValue">
                {view.physicalProfile.weightKg != null ? `${view.physicalProfile.weightKg} kg` : '—'}
              </span>
            </li>
          </ul>
        ) : (
          <EmptyState title="Physical profile not listed" />
        )}
      </div>

      <div className="sectionBlock">
        <h2>Recruiting</h2>
        {view.recruitingProfile ? (
          <ul className="metaList">
            <li>
              <span className="metaLabel">Status</span>
              <span className="metaValue">{view.recruitingProfile.recruitingStatus}</span>
            </li>
            <li>
              <span className="metaLabel">Commitment</span>
              <span className="metaValue">{view.recruitingProfile.commitmentStatus}</span>
            </li>
          </ul>
        ) : (
          <EmptyState title="Recruiting status not listed" />
        )}
        {view.recruitingProfile?.recruitingBiography ? (
          <p style={{ marginTop: '0.75rem' }}>{view.recruitingProfile.recruitingBiography}</p>
        ) : null}
      </div>

      <div className="sectionBlock">
        <h2>Stats</h2>
        <EmptyState
          title="Stats coming later"
          description="Season and career stats are not part of Stage 4. This space is reserved for verified performance data."
        />
      </div>

      <div className="sectionBlock">
        <h2>Video</h2>
        <EmptyState
          title="Highlight video not available"
          description="Secure media upload is deferred. Stage 4 shows a placeholder only."
        />
      </div>

      <div className="sectionBlock">
        <h2>Performance</h2>
        <EmptyState
          title="Performance insights not available"
          description="AI-assisted performance summaries arrive in a later stage."
        />
      </div>
    </div>
  );
}

export default function AthletePassportPreviewPage() {
  const router = useRouter();
  const [view, setView] = useState<AthletePublicView | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        await getMe();
        const owner = await getMyAthlete();
        if (cancelled) {
          return;
        }

        if (owner.profileStatus === 'PUBLISHED') {
          try {
            const publicView = await getPublicAthlete(owner.slug);
            if (!cancelled) {
              setView(publicView);
              setPreviewMode(false);
              return;
            }
          } catch {
            // Fall through to client-side preview shaping.
          }
        }

        if (!cancelled) {
          setView(ownerToPublicPreview(owner));
          setPreviewMode(true);
        }
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
        setError(err instanceof ApiError ? err.message : 'Unable to load preview.');
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (error) {
    return (
      <main className="wideMain">
        <div className="card">
          <p className="error">{error}</p>
          <Link href="/app/athlete/passport">Back to Passport</Link>
        </div>
      </main>
    );
  }

  if (!view) {
    return (
      <main className="wideMain">
        <div className="card">
          <p>Loading preview…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="wideMain">
      <AthleteNav />
      <PublicPassportView view={view} previewMode={previewMode} />
      <p className="footerNote">
        <Link href="/app/athlete/passport">Edit Passport</Link>
        {' · '}
        <Link href="/app/athlete/settings">Publish settings</Link>
      </p>
    </main>
  );
}
