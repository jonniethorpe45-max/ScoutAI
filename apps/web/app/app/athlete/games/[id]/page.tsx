'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { AthleteNav } from '@/components/AthleteNav';
import {
  ApiError,
  getGame,
  getMe,
  getMyAthlete,
  listMyAthleteSeasons,
  listSportStatistics,
  putGameStatistics,
  upsertParticipation,
  type GameDetailDto,
  type StatisticDefinitionDto,
} from '@/lib/api';

/** Mirrors domain FOOTBALL_POSITION_STAT_CATEGORIES (UI guidance only). */
const FOOTBALL_POSITION_STAT_CATEGORIES: Record<string, string[]> = {
  QB: ['PASSING', 'RUSHING'],
  RB: ['RUSHING', 'RECEIVING'],
  WR: ['RECEIVING', 'RUSHING'],
  TE: ['RECEIVING', 'RUSHING'],
  DL: ['DEFENSE'],
  EDGE: ['DEFENSE'],
  LB: ['DEFENSE'],
  CB: ['DEFENSE'],
  S: ['DEFENSE'],
  K: ['KICKING'],
  P: ['PUNTING'],
  ATH: ['PASSING', 'RUSHING', 'RECEIVING', 'DEFENSE'],
};

const PARTICIPATION_OPTIONS = [
  'PARTICIPATED',
  'CONFIRMED_ACTIVE',
  'EXPECTED',
  'ROSTERED',
  'DID_NOT_PARTICIPATE',
  'UNKNOWN',
] as const;

function formatGameDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
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

export default function GameDetailPage() {
  const params = useParams<{ id: string }>();
  const gameId = params?.id;
  const router = useRouter();

  const [game, setGame] = useState<GameDetailDto | null>(null);
  const [definitions, setDefinitions] = useState<StatisticDefinitionDto[]>([]);
  const [primaryPositionCode, setPrimaryPositionCode] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [participationStatus, setParticipationStatus] = useState('PARTICIPATED');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!gameId) return;
      try {
        await getMe();
        const [detail, athlete, seasons] = await Promise.all([
          getGame(gameId),
          getMyAthlete(),
          listMyAthleteSeasons(),
        ]);
        if (cancelled) return;

        const season =
          seasons.find((s) => s.seasonId === detail.seasonId) ?? seasons[0];
        const sportCode = season?.sportCode ?? athlete.sports.find((s) => s.isPrimary)?.sportCode ?? 'FOOTBALL';
        const defs = await listSportStatistics(sportCode);
        if (cancelled) return;

        const position =
          athlete.positions.find((p) => p.isPrimary) ?? athlete.positions[0];
        setPrimaryPositionCode(position?.code ?? null);
        setDefinitions(defs.filter((d) => d.active && !d.derived));
        setGame(detail);
        setParticipationStatus(detail.participationStatus ?? 'PARTICIPATED');

        const nextValues: Record<string, string> = {};
        for (const stat of detail.statistics) {
          nextValues[stat.statisticCode] = String(stat.numericValue);
        }
        setValues(nextValues);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          router.replace('/sign-in');
          return;
        }
        if (err instanceof ApiError && err.status === 404) {
          setError('Game not found.');
          return;
        }
        setError(err instanceof ApiError ? err.message : 'Unable to load game.');
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [gameId, router]);

  const recommendedCategories = useMemo(() => {
    if (!primaryPositionCode) return null;
    return FOOTBALL_POSITION_STAT_CATEGORIES[primaryPositionCode] ?? null;
  }, [primaryPositionCode]);

  const visibleDefinitions = useMemo(() => {
    if (showAll || !recommendedCategories) return definitions;
    return definitions.filter((d) => recommendedCategories.includes(d.category));
  }, [definitions, recommendedCategories, showAll]);

  async function handleSaveParticipation(event: FormEvent) {
    event.preventDefault();
    if (!gameId) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await upsertParticipation(gameId, { participationStatus });
      setGame(updated);
      setMessage('Participation updated.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to update participation.');
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveStatistics(event: FormEvent) {
    event.preventDefault();
    if (!gameId) return;
    const statistics = Object.entries(values)
      .filter(([, raw]) => raw.trim() !== '')
      .map(([statisticCode, raw]) => ({
        statisticCode,
        numericValue: Number(raw),
      }))
      .filter((row) => Number.isFinite(row.numericValue));

    if (statistics.length === 0) {
      setError('Enter at least one statistic value.');
      return;
    }

    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const saved = await putGameStatistics(gameId, { statistics });
      setGame((prev) =>
        prev
          ? {
              ...prev,
              statistics: saved,
              hasStatistics: saved.length > 0,
            }
          : prev,
      );
      setMessage('Statistics saved.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to save statistics.');
    } finally {
      setBusy(false);
    }
  }

  if (error && !game) {
    return (
      <main className="wideMain">
        <div className="card">
          <p className="error">{error}</p>
          <Link href="/app/athlete/games">Back to games</Link>
        </div>
      </main>
    );
  }

  if (!game) {
    return (
      <main className="wideMain">
        <div className="card">
          <p>Loading game…</p>
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
        <h1>
          vs {game.opponentName ?? `${game.awayTeamName} / ${game.homeTeamName}`}
        </h1>
        <p className="mutedNote">
          <Link href="/app/athlete/games">Back to games</Link>
        </p>
        <ul className="metaList">
          <li>
            <span className="metaLabel">When</span>
            <span className="metaValue">{formatGameDate(game.scheduledStart)}</span>
          </li>
          <li>
            <span className="metaLabel">Home / Away</span>
            <span className="metaValue">{game.homeAway}</span>
          </li>
          <li>
            <span className="metaLabel">Score</span>
            <span className="metaValue">
              {game.homeScore != null && game.awayScore != null
                ? `${game.homeScore}–${game.awayScore}`
                : '—'}
            </span>
          </li>
          <li>
            <span className="metaLabel">Result</span>
            <span className="metaValue">{game.result ?? '—'}</span>
          </li>
          <li>
            <span className="metaLabel">Location</span>
            <span className="metaValue">{game.locationName ?? '—'}</span>
          </li>
          <li>
            <span className="metaLabel">Status</span>
            <span className="metaValue">{game.status}</span>
          </li>
        </ul>
      </div>

      {error ? (
        <div className="sectionBlock">
          <p className="error">{error}</p>
        </div>
      ) : null}
      {message ? (
        <div className="sectionBlock">
          <p className="mutedNote">{message}</p>
        </div>
      ) : null}

      <form className="sectionBlock form" onSubmit={(e) => void handleSaveParticipation(e)}>
        <h2>Participation</h2>
        <label className="label">
          Status
          <select
            className="input"
            value={participationStatus}
            onChange={(e) => setParticipationStatus(e.target.value)}
          >
            {PARTICIPATION_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
        <div className="actions">
          <button type="submit" className="button buttonPrimary" disabled={busy}>
            Save participation
          </button>
        </div>
      </form>

      <form className="sectionBlock form" onSubmit={(e) => void handleSaveStatistics(e)}>
        <h2>Statistics</h2>
        <p className="mutedNote">
          {recommendedCategories && !showAll
            ? `Showing recommended stats for ${primaryPositionCode ?? 'your position'}.`
            : 'Showing all active statistics for this sport.'}{' '}
          Values you enter are self-reported until verified.
        </p>
        <div className="actions" style={{ marginTop: 0 }}>
          <button
            type="button"
            className="button buttonSecondary"
            onClick={() => setShowAll((v) => !v)}
          >
            {showAll || !recommendedCategories ? 'Show recommended' : 'Show all'}
          </button>
        </div>

        <div className="formGrid">
          {visibleDefinitions.map((def) => (
            <label key={def.code} className="label">
              {def.name}
              {def.unit ? ` (${def.unit})` : ''}
              <input
                className="input"
                type="number"
                step="any"
                value={values[def.code] ?? ''}
                onChange={(e) =>
                  setValues((prev) => ({ ...prev, [def.code]: e.target.value }))
                }
              />
            </label>
          ))}
        </div>

        {game.statistics.length > 0 ? (
          <div>
            <h3 style={{ fontSize: '1rem', margin: '1rem 0 0.5rem' }}>Saved values</h3>
            <ul className="metaList">
              {game.statistics.map((stat) => (
                <li key={stat.statisticCode}>
                  <span className="metaLabel">
                    {stat.shortName}: {stat.numericValue}
                    {stat.unit ? ` ${stat.unit}` : ''}
                  </span>
                  <span className="metaValue">
                    {sourceDisplay(stat.sourceType)} · {stat.verificationStatus}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="actions">
          <button type="submit" className="button buttonPrimary" disabled={busy}>
            Save statistics
          </button>
        </div>
      </form>

      <div className="sectionBlock">
        <h2>Video</h2>
        <p className="mutedNote">{game.videoPlaceholder}</p>
      </div>
    </main>
  );
}
