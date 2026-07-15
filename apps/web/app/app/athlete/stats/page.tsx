'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { EmptyState } from '@scoutai/ui';
import { AthleteNav } from '@/components/AthleteNav';
import {
  ApiError,
  getMe,
  getSeasonAggregates,
  getSeasonGameStats,
  listMyAthleteSeasons,
  type AthleteSeasonDto,
  type GameByGameStatRowDto,
  type SeasonAggregateDto,
} from '@/lib/api';

function formatGameDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' });
  } catch {
    return iso;
  }
}

function sourceDisplay(sourceType: string): string {
  switch (sourceType) {
    case 'SELF_REPORTED':
      return 'Self Reported';
    case 'COACH_REPORTED':
      return 'Coach Reported';
    case 'ORGANIZATION_REPORTED':
      return 'Organization Reported';
    case 'IMPORTED':
      return 'Imported';
    case 'SOURCE_VERIFIED':
      return 'Source Verified';
    case 'SCOUTAI_VERIFIED':
      return 'ScoutAI Verified';
    default:
      return sourceType;
  }
}

export default function AthleteStatsPage() {
  const router = useRouter();
  const [seasons, setSeasons] = useState<AthleteSeasonDto[] | null>(null);
  const [selectedId, setSelectedId] = useState('');
  const [aggregates, setAggregates] = useState<SeasonAggregateDto | null>(null);
  const [gameRows, setGameRows] = useState<GameByGameStatRowDto[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function loadForSeason(athleteSeasonId: string) {
    if (!athleteSeasonId) {
      setAggregates(null);
      setGameRows([]);
      return;
    }
    const [agg, rows] = await Promise.all([
      getSeasonAggregates(athleteSeasonId),
      getSeasonGameStats(athleteSeasonId),
    ]);
    setAggregates(agg);
    setGameRows(rows);
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        await getMe();
        const seasonList = await listMyAthleteSeasons();
        if (cancelled) return;
        setSeasons(seasonList);
        const initial = seasonList[0]?.id ?? '';
        setSelectedId(initial);
        if (initial) {
          await loadForSeason(initial);
        }
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          router.replace('/sign-in');
          return;
        }
        if (err instanceof ApiError && err.status === 404) {
          router.replace('/app/athlete/onboarding');
          return;
        }
        setError(err instanceof ApiError ? err.message : 'Unable to load stats.');
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const { baseTotals, derivedTotals } = useMemo(() => {
    const totals = aggregates?.totals ?? [];
    return {
      baseTotals: totals.filter((t) => !t.derived),
      derivedTotals: totals.filter((t) => t.derived),
    };
  }, [aggregates]);

  const columnCodes = useMemo(() => {
    const codes = new Set<string>();
    for (const row of gameRows) {
      for (const stat of row.statistics) {
        if (!stat.derived) codes.add(stat.statisticCode);
      }
    }
    return Array.from(codes);
  }, [gameRows]);

  const shortNameByCode = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of gameRows) {
      for (const stat of row.statistics) {
        map.set(stat.statisticCode, stat.shortName);
      }
    }
    for (const total of aggregates?.totals ?? []) {
      map.set(total.statisticCode, total.shortName);
    }
    return map;
  }, [gameRows, aggregates]);

  async function handleSeasonChange(id: string) {
    setSelectedId(id);
    setError(null);
    try {
      await loadForSeason(id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load season stats.');
    }
  }

  if (error && seasons === null) {
    return (
      <main className="wideMain">
        <div className="card">
          <p className="error">{error}</p>
          <Link href="/app">Back to app</Link>
        </div>
      </main>
    );
  }

  if (seasons === null) {
    return (
      <main className="wideMain">
        <div className="card">
          <p>Loading stats…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="wideMain">
      <AthleteNav />
      <div className="sectionBlock">
        <p className="brand" style={{ margin: 0, fontSize: '1.25rem' }}>
          ScoutAI
        </p>
        <h1>Season stats</h1>
        <p className="mutedNote">
          Season totals and game-by-game numbers from your logged statistics. No rankings or
          comparisons are shown.
        </p>
      </div>

      {error ? (
        <div className="sectionBlock">
          <p className="error">{error}</p>
        </div>
      ) : null}

      {seasons.length === 0 ? (
        <div className="sectionBlock">
          <EmptyState
            title="No seasons yet"
            description="Create a season and log games to see season statistics."
          />
          <div className="actions">
            <Link className="button buttonPrimary" href="/app/athlete/games">
              Go to games
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="sectionBlock">
            <label className="label">
              Season
              <select
                className="input"
                value={selectedId}
                onChange={(e) => void handleSeasonChange(e.target.value)}
              >
                {seasons.map((season) => (
                  <option key={season.id} value={season.id}>
                    {season.seasonName} ({season.seasonYear}) · {season.sportCode}
                  </option>
                ))}
              </select>
            </label>
            <p className="mutedNote" style={{ marginTop: '0.75rem' }}>
              Games with participation: {aggregates?.gamesPlayed ?? 0}
            </p>
          </div>

          <div className="sectionBlock">
            <h2>Season totals</h2>
            {baseTotals.length === 0 ? (
              <EmptyState
                title="No totals yet"
                description="Save statistics on individual games to build season aggregates."
              />
            ) : (
              <ul className="metaList">
                {baseTotals.map((stat) => (
                  <li key={stat.statisticCode}>
                    <span className="metaLabel">
                      {stat.name}
                      {stat.unit ? ` (${stat.unit})` : ''}
                    </span>
                    <span className="metaValue">
                      {stat.numericValue} · {sourceDisplay(stat.sourceType)} ·{' '}
                      {stat.verificationStatus}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="sectionBlock">
            <h2>Derived metrics</h2>
            {derivedTotals.length === 0 ? (
              <p className="mutedNote">
                Derived rates appear when supporting counting stats are available.
              </p>
            ) : (
              <ul className="metaList">
                {derivedTotals.map((stat) => (
                  <li key={stat.statisticCode}>
                    <span className="metaLabel">
                      {stat.name}
                      {stat.unit ? ` (${stat.unit})` : ''}
                    </span>
                    <span className="metaValue">
                      {stat.numericValue} · derived · {stat.verificationStatus}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="sectionBlock">
            <h2>Game by game</h2>
            {gameRows.length === 0 ? (
              <EmptyState title="No game stats" description="Stats appear after you save them on a game." />
            ) : (
              <div className="tableScroll">
                <table className="dataTable">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Opponent</th>
                      <th>Result</th>
                      {columnCodes.map((code) => (
                        <th key={code}>{shortNameByCode.get(code) ?? code}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {gameRows.map((row) => {
                      const byCode = new Map(
                        row.statistics.map((s) => [s.statisticCode, s.numericValue]),
                      );
                      return (
                        <tr key={row.gameId}>
                          <td>{formatGameDate(row.scheduledStart)}</td>
                          <td>
                            <Link href={`/app/athlete/games/${row.gameId}`}>
                              {row.opponentName ?? 'Game'}
                            </Link>
                          </td>
                          <td>{row.result ?? '—'}</td>
                          {columnCodes.map((code) => (
                            <td key={code}>
                              {byCode.has(code) ? byCode.get(code) : '—'}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </main>
  );
}
