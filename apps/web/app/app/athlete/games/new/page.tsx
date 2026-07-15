'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useEffect, useMemo, useState } from 'react';
import { AthleteNav } from '@/components/AthleteNav';
import {
  ApiError,
  createGame,
  getMe,
  getMyAthlete,
  listMyAthleteSeasons,
  type AthleteSeasonDto,
} from '@/lib/api';

const PARTICIPATION_OPTIONS = [
  'PARTICIPATED',
  'CONFIRMED_ACTIVE',
  'EXPECTED',
  'ROSTERED',
  'DID_NOT_PARTICIPATE',
  'UNKNOWN',
] as const;

function toIsoFromLocal(value: string): string {
  return new Date(value).toISOString();
}

function NewGameForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselect = searchParams.get('season') ?? '';

  const [seasons, setSeasons] = useState<AthleteSeasonDto[]>([]);
  const [athleteSeasonId, setAthleteSeasonId] = useState(preselect);
  const [scheduledLocal, setScheduledLocal] = useState('');
  const [opponent, setOpponent] = useState('');
  const [homeAway, setHomeAway] = useState<'HOME' | 'AWAY'>('HOME');
  const [locationName, setLocationName] = useState('');
  const [homeScore, setHomeScore] = useState('');
  const [awayScore, setAwayScore] = useState('');
  const [participationStatus, setParticipationStatus] = useState<string>('PARTICIPATED');
  const [teamName, setTeamName] = useState('My Team');
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const selectedSeason = useMemo(
    () => seasons.find((s) => s.id === athleteSeasonId),
    [seasons, athleteSeasonId],
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        await getMe();
        const [seasonList, athlete] = await Promise.all([
          listMyAthleteSeasons(),
          getMyAthlete(),
        ]);
        if (cancelled) return;
        setSeasons(seasonList);
        const initial =
          (preselect && seasonList.find((s) => s.id === preselect)?.id) ||
          seasonList[0]?.id ||
          '';
        setAthleteSeasonId(initial);
        const match = seasonList.find((s) => s.id === initial);
        setTeamName(
          match?.selfReportedTeamName ||
            athlete.teamNameReported ||
            athlete.schoolNameReported ||
            'My Team',
        );
        setLoaded(true);
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
        setError(err instanceof ApiError ? err.message : 'Unable to load form.');
        setLoaded(true);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [router, preselect]);

  useEffect(() => {
    if (!selectedSeason) return;
    if (selectedSeason.selfReportedTeamName) {
      setTeamName(selectedSeason.selfReportedTeamName);
    }
  }, [selectedSeason]);

  async function handleSubmit(event: FormEvent, forceDuplicate = false) {
    event.preventDefault();
    if (!selectedSeason) {
      setError('Select a season.');
      return;
    }
    if (!scheduledLocal || !opponent.trim()) {
      setError('Date/time and opponent are required.');
      return;
    }

    setBusy(true);
    setError(null);
    setWarning(null);
    try {
      const myTeam = teamName.trim() || 'My Team';
      const opp = opponent.trim();
      const homeTeamName = homeAway === 'HOME' ? myTeam : opp;
      const awayTeamName = homeAway === 'HOME' ? opp : myTeam;

      const result = await createGame({
        seasonId: selectedSeason.seasonId,
        athleteSeasonId: selectedSeason.id,
        scheduledStart: toIsoFromLocal(scheduledLocal),
        homeTeamName,
        awayTeamName,
        athleteTeamSide: homeAway,
        locationName: locationName.trim() || null,
        homeScore: homeScore === '' ? null : Number(homeScore),
        awayScore: awayScore === '' ? null : Number(awayScore),
        participationStatus,
        forceDuplicate: forceDuplicate || undefined,
      });

      if (result.duplicateWarning && !forceDuplicate) {
        setWarning(
          `Possible duplicate game detected (${result.possibleDuplicates.length}). Submit again to save anyway.`,
        );
        setBusy(false);
        return;
      }

      router.push(`/app/athlete/games/${result.game.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to create game.');
      setBusy(false);
    }
  }

  if (!loaded) {
    return (
      <main className="wideMain">
        <div className="card">
          <p>Loading…</p>
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
        <h1>Add game</h1>
        <p className="mutedNote">
          <Link href="/app/athlete/games">Back to games</Link>
        </p>
      </div>

      {seasons.length === 0 ? (
        <div className="sectionBlock">
          <p className="error">Create a season before adding a game.</p>
          <Link href="/app/athlete/games">Go to games</Link>
        </div>
      ) : (
        <form
          className="sectionBlock form"
          onSubmit={(e) => void handleSubmit(e, Boolean(warning))}
        >
          {error ? <p className="error">{error}</p> : null}
          {warning ? <p className="mutedNote">{warning}</p> : null}

          <div className="formGrid">
            <label className="label">
              Season
              <select
                className="input"
                value={athleteSeasonId}
                onChange={(e) => setAthleteSeasonId(e.target.value)}
                required
              >
                {seasons.map((season) => (
                  <option key={season.id} value={season.id}>
                    {season.seasonName} ({season.seasonYear})
                  </option>
                ))}
              </select>
            </label>

            <label className="label">
              Date &amp; time
              <input
                className="input"
                type="datetime-local"
                value={scheduledLocal}
                onChange={(e) => setScheduledLocal(e.target.value)}
                required
              />
            </label>

            <label className="label">
              Your team name
              <input
                className="input"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                required
              />
            </label>

            <label className="label">
              Opponent
              <input
                className="input"
                value={opponent}
                onChange={(e) => setOpponent(e.target.value)}
                placeholder={homeAway === 'HOME' ? 'Away team' : 'Home team'}
                required
              />
            </label>

            <label className="label">
              Home / Away
              <select
                className="input"
                value={homeAway}
                onChange={(e) => setHomeAway(e.target.value as 'HOME' | 'AWAY')}
              >
                <option value="HOME">Home</option>
                <option value="AWAY">Away</option>
              </select>
            </label>

            <label className="label">
              Location (optional)
              <input
                className="input"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
              />
            </label>

            <label className="label">
              Home score (optional)
              <input
                className="input"
                type="number"
                min={0}
                max={999}
                value={homeScore}
                onChange={(e) => setHomeScore(e.target.value)}
              />
            </label>

            <label className="label">
              Away score (optional)
              <input
                className="input"
                type="number"
                min={0}
                max={999}
                value={awayScore}
                onChange={(e) => setAwayScore(e.target.value)}
              />
            </label>

            <label className="label">
              Participation
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
          </div>

          <div className="actions">
            <button type="submit" className="button buttonPrimary" disabled={busy}>
              {busy ? 'Saving…' : warning ? 'Save anyway' : 'Create game'}
            </button>
            <Link className="button buttonSecondary" href="/app/athlete/games">
              Cancel
            </Link>
          </div>
        </form>
      )}
    </main>
  );
}

export default function NewGamePage() {
  return (
    <Suspense
      fallback={
        <main className="wideMain">
          <div className="card">
            <p>Loading…</p>
          </div>
        </main>
      }
    >
      <NewGameForm />
    </Suspense>
  );
}
