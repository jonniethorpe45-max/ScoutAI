import type { StatisticAggregationType } from '@scoutai/domain';

export interface AggregateInputValue {
  code: string;
  value: number;
  gameId: string;
  scheduledStart: Date;
}

export interface AggregateDefinition {
  code: string;
  aggregationType: StatisticAggregationType | string;
}

/**
 * Query-time season aggregation (Stage 5 decision):
 * PostgreSQL game-level rows are authoritative; season totals are derived
 * from AthleteGameStatistic values (excluding DERIVED definitions).
 */
export function aggregateSeasonTotals(
  definitions: AggregateDefinition[],
  values: AggregateInputValue[],
): Map<string, number | null> {
  const byCode = new Map<string, AggregateInputValue[]>();
  for (const value of values) {
    const list = byCode.get(value.code) ?? [];
    list.push(value);
    byCode.set(value.code, list);
  }

  const result = new Map<string, number | null>();
  for (const def of definitions) {
    if (def.aggregationType === 'DERIVED') {
      continue;
    }
    const rows = byCode.get(def.code) ?? [];
    if (rows.length === 0) {
      result.set(def.code, null);
      continue;
    }
    result.set(def.code, reduceAggregation(def.aggregationType, rows));
  }
  return result;
}

function reduceAggregation(
  aggregationType: string,
  rows: AggregateInputValue[],
): number | null {
  switch (aggregationType) {
    case 'SUM':
      return rows.reduce((sum, row) => sum + row.value, 0);
    case 'AVERAGE':
      return rows.reduce((sum, row) => sum + row.value, 0) / rows.length;
    case 'MAX':
      return Math.max(...rows.map((row) => row.value));
    case 'MIN':
      return Math.min(...rows.map((row) => row.value));
    case 'LATEST': {
      const sorted = [...rows].sort(
        (a, b) => b.scheduledStart.getTime() - a.scheduledStart.getTime(),
      );
      return sorted[0]?.value ?? null;
    }
    default:
      return null;
  }
}

export function computeDerivedMetric(
  code: string,
  totals: Map<string, number | null>,
): number | null {
  const get = (key: string): number | null => {
    const value = totals.get(key);
    return value === undefined ? null : value;
  };

  switch (code) {
    case 'COMPLETION_PERCENTAGE': {
      const completions = get('PASS_COMPLETIONS');
      const attempts = get('PASS_ATTEMPTS');
      if (completions === null || attempts === null || attempts === 0) {
        return null;
      }
      return (completions / attempts) * 100;
    }
    case 'YARDS_PER_CARRY': {
      const yards = get('RUSHING_YARDS');
      const attempts = get('RUSH_ATTEMPTS');
      if (yards === null || attempts === null || attempts === 0) {
        return null;
      }
      return yards / attempts;
    }
    case 'YARDS_PER_RECEPTION': {
      const yards = get('RECEIVING_YARDS');
      const receptions = get('RECEPTIONS');
      if (yards === null || receptions === null || receptions === 0) {
        return null;
      }
      return yards / receptions;
    }
    default:
      return null;
  }
}

export function pickPersonalBest<T extends { numericValue: number }>(
  results: T[],
  lowerIsBetter: boolean,
): T | null {
  if (results.length === 0) {
    return null;
  }
  return results.reduce((best, current) => {
    if (lowerIsBetter) {
      return current.numericValue < best.numericValue ? current : best;
    }
    return current.numericValue > best.numericValue ? current : best;
  });
}

export function normalizeTeamName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Soft duplicate window: same season + teams + start within ±12 hours. */
export const DUPLICATE_WINDOW_MS = 12 * 60 * 60 * 1000;

export function isLikelyDuplicateGame(input: {
  seasonId: string;
  homeTeamName: string;
  awayTeamName: string;
  scheduledStart: Date;
  candidate: {
    seasonId: string;
    homeTeamName: string;
    awayTeamName: string;
    scheduledStart: Date;
  };
}): boolean {
  if (input.seasonId !== input.candidate.seasonId) {
    return false;
  }
  const home = normalizeTeamName(input.homeTeamName);
  const away = normalizeTeamName(input.awayTeamName);
  const cHome = normalizeTeamName(input.candidate.homeTeamName);
  const cAway = normalizeTeamName(input.candidate.awayTeamName);
  const sameMatchup =
    (home === cHome && away === cAway) || (home === cAway && away === cHome);
  if (!sameMatchup) {
    return false;
  }
  const delta = Math.abs(
    input.scheduledStart.getTime() - input.candidate.scheduledStart.getTime(),
  );
  return delta <= DUPLICATE_WINDOW_MS;
}

export function resolveOpponent(input: {
  homeTeamName: string;
  awayTeamName: string;
  athleteTeamName?: string | null;
  athleteTeamSide?: 'HOME' | 'AWAY' | 'UNKNOWN' | null;
}): { opponentName: string | null; homeAway: 'HOME' | 'AWAY' | 'UNKNOWN' } {
  if (input.athleteTeamSide === 'HOME') {
    return { opponentName: input.awayTeamName, homeAway: 'HOME' };
  }
  if (input.athleteTeamSide === 'AWAY') {
    return { opponentName: input.homeTeamName, homeAway: 'AWAY' };
  }
  const team = input.athleteTeamName ? normalizeTeamName(input.athleteTeamName) : '';
  if (team && team === normalizeTeamName(input.homeTeamName)) {
    return { opponentName: input.awayTeamName, homeAway: 'HOME' };
  }
  if (team && team === normalizeTeamName(input.awayTeamName)) {
    return { opponentName: input.homeTeamName, homeAway: 'AWAY' };
  }
  return { opponentName: null, homeAway: 'UNKNOWN' };
}

export function resolveResult(input: {
  homeScore: number | null;
  awayScore: number | null;
  homeAway: 'HOME' | 'AWAY' | 'UNKNOWN';
}): 'WIN' | 'LOSS' | 'TIE' | 'UNKNOWN' | null {
  if (input.homeScore === null || input.awayScore === null) {
    return null;
  }
  if (input.homeAway === 'UNKNOWN') {
    return 'UNKNOWN';
  }
  if (input.homeScore === input.awayScore) {
    return 'TIE';
  }
  const athleteScore = input.homeAway === 'HOME' ? input.homeScore : input.awayScore;
  const opponentScore = input.homeAway === 'HOME' ? input.awayScore : input.homeScore;
  return athleteScore > opponentScore ? 'WIN' : 'LOSS';
}

export function sourceLabel(sourceType: string): string {
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
