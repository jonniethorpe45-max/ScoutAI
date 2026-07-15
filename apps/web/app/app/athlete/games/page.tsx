'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { EmptyState } from '@scoutai/ui';
import { AthleteNav } from '@/components/AthleteNav';
import {
  ApiError,
  createAthleteSeasonCatalog,
  getMe,
  listMyAthleteSeasons,
  listMyGames,
  type AthleteSeasonDto,
  type GameListItemDto,
} from '@/lib/api';

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

function defaultSeasonName(): { name: string; year: number } {
  const year = new Date().getFullYear();
  return { name: `${year} Fall`, year };
}

export default function AthleteGamesPage() {
  const router = useRouter();
  const [seasons, setSeasons] = useState<AthleteSeasonDto[] | null>(null);
  const [selectedAthleteSeasonId, setSelectedAthleteSeasonId] = useState('');
  const [games, setGames] = useState<GameListItemDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function loadSeasonsAndGames(preferredId?: string) {
    const seasonList = await listMyAthleteSeasons();
    setSeasons(seasonList);
    const nextId =
      preferredId && seasonList.some((s) => s.id === preferredId)
        ? preferredId
        : selectedAthleteSeasonId && seasonList.some((s) => s.id === selectedAthleteSeasonId)
          ? selectedAthleteSeasonId
          : (seasonList[0]?.id ?? '');
    setSelectedAthleteSeasonId(nextId);
    if (!nextId) {
      setGames([]);
      return;
    }
    const season = seasonList.find((s) => s.id === nextId);
    const list = await listMyGames(season?.seasonId);
    setGames(list);
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        await getMe();
        const seasonList = await listMyAthleteSeasons();
        if (cancelled) return;
        setSeasons(seasonList);
        const nextId = seasonList[0]?.id ?? '';
        setSelectedAthleteSeasonId(nextId);
        if (!nextId) {
          setGames([]);
          return;
        }
        const season = seasonList.find((s) => s.id === nextId);
        const list = await listMyGames(season?.seasonId);
        if (!cancelled) setGames(list);
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
        setError(err instanceof ApiError ? err.message : 'Unable to load games.');
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleSeasonChange(athleteSeasonId: string) {
    setSelectedAthleteSeasonId(athleteSeasonId);
    setError(null);
    try {
      const season = seasons?.find((s) => s.id === athleteSeasonId);
      const list = await listMyGames(season?.seasonId);
      setGames(list);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load games.');
    }
  }

  async function handleCreateCatalogSeason() {
    setBusy(true);
    setError(null);
    try {
      const { name, year } = defaultSeasonName();
      const created = await createAthleteSeasonCatalog({
        sportCode: 'FOOTBALL',
        name,
        year,
      });
      await loadSeasonsAndGames(created.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to create season.');
    } finally {
      setBusy(false);
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
          <p>Loading games…</p>
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
        <h1>Games</h1>
        <p className="mutedNote">Log games, participation, and per-game statistics for your seasons.</p>
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
            description="Create a football season catalog entry to start logging games."
          />
          <div className="actions">
            <button
              type="button"
              className="button buttonPrimary"
              disabled={busy}
              onClick={() => void handleCreateCatalogSeason()}
            >
              {busy ? 'Creating…' : `Create ${defaultSeasonName().name} season`}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="sectionBlock">
            <label className="label">
              Season
              <select
                className="input"
                value={selectedAthleteSeasonId}
                onChange={(e) => void handleSeasonChange(e.target.value)}
              >
                {seasons.map((season) => (
                  <option key={season.id} value={season.id}>
                    {season.seasonName} ({season.seasonYear}) · {season.sportCode}
                  </option>
                ))}
              </select>
            </label>
            <div className="actions">
              <Link
                className="button buttonPrimary"
                href={`/app/athlete/games/new${selectedAthleteSeasonId ? `?season=${selectedAthleteSeasonId}` : ''}`}
              >
                Add Game
              </Link>
            </div>
          </div>

          <div className="sectionBlock">
            <h2>Game list</h2>
            {games.length === 0 ? (
              <EmptyState
                title="No games logged"
                description="Add a game to track result, participation, and stats."
              />
            ) : (
              <table className="dataTable">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Opponent</th>
                    <th>Result</th>
                    <th>Participation</th>
                    <th>Stats</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {games.map((game) => (
                    <tr key={game.id}>
                      <td>{formatGameDate(game.scheduledStart)}</td>
                      <td>
                        {game.opponentName ?? '—'}
                        {game.homeAway !== 'UNKNOWN' ? (
                          <span className="mutedNote"> ({game.homeAway.toLowerCase()})</span>
                        ) : null}
                      </td>
                      <td>{game.result ?? '—'}</td>
                      <td>{game.participationStatus ?? '—'}</td>
                      <td>{game.hasStatistics ? 'Yes' : 'No'}</td>
                      <td>
                        <Link href={`/app/athlete/games/${game.id}`}>Open Game</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </main>
  );
}
