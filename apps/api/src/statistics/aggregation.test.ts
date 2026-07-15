import { describe, expect, it } from 'vitest';
import {
  aggregateSeasonTotals,
  computeDerivedMetric,
  isLikelyDuplicateGame,
  pickPersonalBest,
  resolveOpponent,
  resolveResult,
} from './aggregation';

describe('stage5 aggregation', () => {
  it('sums rushing yards across games', () => {
    const totals = aggregateSeasonTotals(
      [{ code: 'RUSHING_YARDS', aggregationType: 'SUM' }],
      [
        { code: 'RUSHING_YARDS', value: 80, gameId: '1', scheduledStart: new Date('2026-09-01') },
        { code: 'RUSHING_YARDS', value: 45, gameId: '2', scheduledStart: new Date('2026-09-08') },
      ],
    );
    expect(totals.get('RUSHING_YARDS')).toBe(125);
  });

  it('computes derived metrics and handles division by zero', () => {
    const totals = new Map<string, number | null>([
      ['PASS_COMPLETIONS', 10],
      ['PASS_ATTEMPTS', 20],
      ['RUSHING_YARDS', 100],
      ['RUSH_ATTEMPTS', 0],
      ['RECEIVING_YARDS', 90],
      ['RECEPTIONS', 9],
    ]);
    expect(computeDerivedMetric('COMPLETION_PERCENTAGE', totals)).toBe(50);
    expect(computeDerivedMetric('YARDS_PER_CARRY', totals)).toBeNull();
    expect(computeDerivedMetric('YARDS_PER_RECEPTION', totals)).toBe(10);
  });

  it('picks personal best for lower-is-better and higher-is-better', () => {
    const times = [
      { numericValue: 4.71 },
      { numericValue: 4.52 },
      { numericValue: 4.59 },
    ];
    expect(pickPersonalBest(times, true)?.numericValue).toBe(4.52);
    const jumps = [{ numericValue: 80 }, { numericValue: 91 }, { numericValue: 88 }];
    expect(pickPersonalBest(jumps, false)?.numericValue).toBe(91);
  });

  it('detects soft duplicate games without brittle uniqueness', () => {
    const base = {
      seasonId: 's1',
      homeTeamName: 'North Field',
      awayTeamName: 'River City',
      scheduledStart: new Date('2026-09-12T18:00:00.000Z'),
    };
    expect(
      isLikelyDuplicateGame({
        ...base,
        candidate: {
          ...base,
          scheduledStart: new Date('2026-09-12T19:00:00.000Z'),
        },
      }),
    ).toBe(true);
    expect(
      isLikelyDuplicateGame({
        ...base,
        candidate: {
          ...base,
          awayTeamName: 'Other Team',
        },
      }),
    ).toBe(false);
  });

  it('resolves opponent and result when team context known', () => {
    const ctx = resolveOpponent({
      homeTeamName: 'North Field',
      awayTeamName: 'River City',
      athleteTeamName: 'North Field',
    });
    expect(ctx).toEqual({ opponentName: 'River City', homeAway: 'HOME' });
    expect(
      resolveResult({ homeScore: 28, awayScore: 21, homeAway: 'HOME' }),
    ).toBe('WIN');
    expect(
      resolveResult({ homeScore: null, awayScore: 21, homeAway: 'HOME' }),
    ).toBeNull();
  });
});
