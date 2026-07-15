'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { EmptyState, StatusBadge } from '@scoutai/ui';
import {
  ApiError,
  getPublicAthlete,
  getPublicPerformance,
  type AthletePublicView,
  type PublicPerformanceSection,
} from '@/lib/api';

function formatGameDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' });
  } catch {
    return iso;
  }
}

export default function PublicAthletePage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug;
  const [view, setView] = useState<AthletePublicView | null>(null);
  const [performance, setPerformance] = useState<PublicPerformanceSection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!slug) {
        return;
      }
      try {
        const [publicView, publicPerformance] = await Promise.all([
          getPublicAthlete(slug),
          getPublicPerformance(slug),
        ]);
        if (!cancelled) {
          setView(publicView);
          setPerformance(publicPerformance);
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

  if (!view || !performance) {
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
  const shownBests = performance.performanceBests.filter((b) => b.value != null);

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
        <h2>Season Statistics</h2>
        {performance.seasonSummaries.length === 0 ? (
          <EmptyState
            title="No public game statistics have been added yet."
            description="Totals appear here after the athlete logs and shares game statistics."
          />
        ) : (
          performance.seasonSummaries.map((season) => (
            <div key={`${season.seasonName}-${season.seasonYear}`} style={{ marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1rem', margin: '0 0 0.5rem' }}>
                {season.seasonName} ({season.seasonYear})
              </h3>
              <ul className="metaList">
                {season.totals.map((total) => (
                  <li key={total.code}>
                    <span className="metaLabel">
                      {total.name}
                      {total.unit ? ` (${total.unit})` : ''}
                    </span>
                    <span className="metaValue">
                      {total.value} · {total.sourceLabel}
                      {total.verificationStatus === 'VERIFIED' ? '' : ' · unverified'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </div>

      <div className="sectionBlock">
        <h2>Recent Games</h2>
        {performance.recentGames.length === 0 ? (
          <EmptyState title="No recent games" description="Logged games will appear here." />
        ) : (
          <table className="dataTable">
            <thead>
              <tr>
                <th>Date</th>
                <th>Opponent</th>
                <th>Result</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {performance.recentGames.map((game, index) => (
                <tr key={`${game.scheduledStart}-${index}`}>
                  <td>{formatGameDate(game.scheduledStart)}</td>
                  <td>
                    {game.opponentName ?? '—'}
                    {game.homeAway !== 'UNKNOWN' ? (
                      <span className="mutedNote"> ({game.homeAway.toLowerCase()})</span>
                    ) : null}
                  </td>
                  <td>{game.result ?? '—'}</td>
                  <td>
                    {game.homeScore != null && game.awayScore != null
                      ? `${game.homeScore}–${game.awayScore}`
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
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
        {shownBests.length === 0 ? (
          <EmptyState
            title="No verified performance result is available yet."
            description="Self-reported or verified personal bests will appear here when shared."
          />
        ) : (
          <ul className="metaList">
            {shownBests.map((best) => (
              <li key={best.testCode}>
                <span className="metaLabel">
                  {best.testName}
                  {best.unit ? ` (${best.unit})` : ''}
                </span>
                <span className="metaValue">
                  {best.value}
                  {best.verifiedBestAvailable
                    ? ' · verified'
                    : ` · ${best.sourceLabel ?? 'Self Reported'} · not verified`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="footerNote">Public Passport · email, date of birth, and guardian details are never shown here.</p>
    </main>
  );
}
