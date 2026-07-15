'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { EmptyState, StatusBadge } from '@scoutai/ui';
import { ApiError, getPublicAthlete, type AthletePublicView } from '@/lib/api';

export default function PublicAthletePage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug;
  const [view, setView] = useState<AthletePublicView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!slug) {
        return;
      }
      try {
        const publicView = await getPublicAthlete(slug);
        if (!cancelled) {
          setView(publicView);
        }
      } catch (err) {
        if (cancelled) {
          return;
        }
        if (err instanceof ApiError && (err.status === 403 || err.status === 404)) {
          setForbidden(true);
          setError('This Passport is not available.');
          return;
        }
        setError(err instanceof ApiError ? err.message : 'Unable to load Passport.');
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (error || forbidden) {
    return (
      <main className="wideMain">
        <div className="card">
          <p className="brand">ScoutAI</p>
          <h1>Passport unavailable</h1>
          <p className="error">{error ?? 'This Passport is not available.'}</p>
          <Link href="/">Home</Link>
        </div>
      </main>
    );
  }

  if (!view) {
    return (
      <main className="wideMain">
        <div className="card">
          <p>Loading Passport…</p>
        </div>
      </main>
    );
  }

  const primarySport = view.sports.find((s) => s.isPrimary) ?? view.sports[0];
  const primaryPosition = view.positions.find((p) => p.isPrimary) ?? view.positions[0];

  return (
    <main className="wideMain">
      <div className="sectionBlock">
        <p className="brand" style={{ fontSize: '1.25rem' }}>
          ScoutAI
        </p>
        <div className="inlineMeta">
          <div className="avatarPlaceholder" aria-hidden>
            {(view.displayName || 'A')
              .split(/\s+/)
              .slice(0, 2)
              .map((p) => p[0]?.toUpperCase() ?? '')
              .join('')}
          </div>
          <div>
            <h1 style={{ marginBottom: '0.35rem' }}>{view.displayName}</h1>
            {view.preferredName ? <p className="mutedNote">Preferred: {view.preferredName}</p> : null}
            <div className="inlineMeta">
              <StatusBadge status={view.profileVisibility} />
            </div>
          </div>
        </div>
        <p>{[view.city, view.stateRegion].filter(Boolean).join(', ') || 'Location not listed'}</p>
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
        {view.biography ? (
          <p>{view.biography}</p>
        ) : (
          <EmptyState title="No biography listed" description="This athlete has not published a bio yet." />
        )}
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
              <span className="metaLabel">Class of</span>
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
          <>
            <ul className="metaList">
              <li>
                <span className="metaLabel">Status</span>
                <span className="metaValue">{view.recruitingProfile.recruitingStatus}</span>
              </li>
              <li>
                <span className="metaLabel">Commitment</span>
                <span className="metaValue">{view.recruitingProfile.commitmentStatus}</span>
              </li>
              {view.recruitingProfile.committedOrganizationText ? (
                <li>
                  <span className="metaLabel">Committed to</span>
                  <span className="metaValue">{view.recruitingProfile.committedOrganizationText}</span>
                </li>
              ) : null}
            </ul>
            {view.recruitingProfile.recruitingBiography ? (
              <p style={{ marginTop: '0.75rem' }}>{view.recruitingProfile.recruitingBiography}</p>
            ) : null}
          </>
        ) : (
          <EmptyState title="Recruiting status not listed" />
        )}
      </div>

      <div className="sectionBlock">
        <h2>Stats</h2>
        <EmptyState
          title="No stats yet"
          description="Verified season and career stats will appear here in a later stage."
        />
      </div>

      <div className="sectionBlock">
        <h2>Video</h2>
        <EmptyState
          title="No highlight video"
          description="Secure media upload is not available in Stage 4. Avatar is a placeholder only."
        />
      </div>

      <div className="sectionBlock">
        <h2>Performance</h2>
        <EmptyState
          title="No performance insights"
          description="AI performance summaries are deferred beyond Stage 4."
        />
      </div>

      <p className="footerNote">Public Passport · email, date of birth, and guardian details are never shown here.</p>
    </main>
  );
}
