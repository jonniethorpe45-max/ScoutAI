/**
 * Idempotent Stage 5 football statistic + performance-test catalog definitions.
 * Used by seed and optionally by tests.
 */

export const FOOTBALL_STAT_DEFINITIONS: Array<{
  code: string;
  name: string;
  shortName: string;
  category: 'PASSING' | 'RUSHING' | 'RECEIVING' | 'DEFENSE' | 'KICKING' | 'PUNTING' | 'RETURNS';
  dataType: 'INTEGER' | 'DECIMAL' | 'PERCENTAGE';
  aggregationType: 'SUM' | 'AVERAGE' | 'MAX' | 'MIN' | 'LATEST' | 'DERIVED';
  unit?: string;
  higherIsBetter?: boolean;
  displayOrder: number;
  description?: string;
}> = [
  { code: 'PASS_ATTEMPTS', name: 'Pass Attempts', shortName: 'ATT', category: 'PASSING', dataType: 'INTEGER', aggregationType: 'SUM', higherIsBetter: true, displayOrder: 10 },
  { code: 'PASS_COMPLETIONS', name: 'Pass Completions', shortName: 'COMP', category: 'PASSING', dataType: 'INTEGER', aggregationType: 'SUM', higherIsBetter: true, displayOrder: 11 },
  { code: 'PASSING_YARDS', name: 'Passing Yards', shortName: 'YDS', category: 'PASSING', dataType: 'INTEGER', aggregationType: 'SUM', unit: 'yd', higherIsBetter: true, displayOrder: 12 },
  { code: 'PASSING_TOUCHDOWNS', name: 'Passing Touchdowns', shortName: 'TD', category: 'PASSING', dataType: 'INTEGER', aggregationType: 'SUM', higherIsBetter: true, displayOrder: 13 },
  { code: 'INTERCEPTIONS_THROWN', name: 'Interceptions Thrown', shortName: 'INT', category: 'PASSING', dataType: 'INTEGER', aggregationType: 'SUM', higherIsBetter: false, displayOrder: 14 },
  { code: 'COMPLETION_PERCENTAGE', name: 'Completion Percentage', shortName: 'COMP%', category: 'PASSING', dataType: 'PERCENTAGE', aggregationType: 'DERIVED', unit: '%', higherIsBetter: true, displayOrder: 15, description: 'PASS_COMPLETIONS / PASS_ATTEMPTS' },

  { code: 'RUSH_ATTEMPTS', name: 'Rush Attempts', shortName: 'ATT', category: 'RUSHING', dataType: 'INTEGER', aggregationType: 'SUM', higherIsBetter: true, displayOrder: 20 },
  { code: 'RUSHING_YARDS', name: 'Rushing Yards', shortName: 'YDS', category: 'RUSHING', dataType: 'INTEGER', aggregationType: 'SUM', unit: 'yd', higherIsBetter: true, displayOrder: 21 },
  { code: 'RUSHING_TOUCHDOWNS', name: 'Rushing Touchdowns', shortName: 'TD', category: 'RUSHING', dataType: 'INTEGER', aggregationType: 'SUM', higherIsBetter: true, displayOrder: 22 },
  { code: 'YARDS_PER_CARRY', name: 'Yards Per Carry', shortName: 'YPC', category: 'RUSHING', dataType: 'DECIMAL', aggregationType: 'DERIVED', unit: 'yd', higherIsBetter: true, displayOrder: 23, description: 'RUSHING_YARDS / RUSH_ATTEMPTS' },

  { code: 'RECEPTIONS', name: 'Receptions', shortName: 'REC', category: 'RECEIVING', dataType: 'INTEGER', aggregationType: 'SUM', higherIsBetter: true, displayOrder: 30 },
  { code: 'RECEIVING_YARDS', name: 'Receiving Yards', shortName: 'YDS', category: 'RECEIVING', dataType: 'INTEGER', aggregationType: 'SUM', unit: 'yd', higherIsBetter: true, displayOrder: 31 },
  { code: 'RECEIVING_TOUCHDOWNS', name: 'Receiving Touchdowns', shortName: 'TD', category: 'RECEIVING', dataType: 'INTEGER', aggregationType: 'SUM', higherIsBetter: true, displayOrder: 32 },
  { code: 'YARDS_PER_RECEPTION', name: 'Yards Per Reception', shortName: 'YPR', category: 'RECEIVING', dataType: 'DECIMAL', aggregationType: 'DERIVED', unit: 'yd', higherIsBetter: true, displayOrder: 33, description: 'RECEIVING_YARDS / RECEPTIONS' },

  { code: 'TOTAL_TACKLES', name: 'Total Tackles', shortName: 'TKL', category: 'DEFENSE', dataType: 'INTEGER', aggregationType: 'SUM', higherIsBetter: true, displayOrder: 40 },
  { code: 'SOLO_TACKLES', name: 'Solo Tackles', shortName: 'SOLO', category: 'DEFENSE', dataType: 'INTEGER', aggregationType: 'SUM', higherIsBetter: true, displayOrder: 41 },
  { code: 'TACKLES_FOR_LOSS', name: 'Tackles For Loss', shortName: 'TFL', category: 'DEFENSE', dataType: 'DECIMAL', aggregationType: 'SUM', higherIsBetter: true, displayOrder: 42 },
  { code: 'SACKS', name: 'Sacks', shortName: 'SACK', category: 'DEFENSE', dataType: 'DECIMAL', aggregationType: 'SUM', higherIsBetter: true, displayOrder: 43 },
  { code: 'INTERCEPTIONS', name: 'Interceptions', shortName: 'INT', category: 'DEFENSE', dataType: 'INTEGER', aggregationType: 'SUM', higherIsBetter: true, displayOrder: 44 },
  { code: 'FORCED_FUMBLES', name: 'Forced Fumbles', shortName: 'FF', category: 'DEFENSE', dataType: 'INTEGER', aggregationType: 'SUM', higherIsBetter: true, displayOrder: 45 },
  { code: 'FUMBLE_RECOVERIES', name: 'Fumble Recoveries', shortName: 'FR', category: 'DEFENSE', dataType: 'INTEGER', aggregationType: 'SUM', higherIsBetter: true, displayOrder: 46 },
  { code: 'PASSES_DEFENDED', name: 'Passes Defended', shortName: 'PD', category: 'DEFENSE', dataType: 'INTEGER', aggregationType: 'SUM', higherIsBetter: true, displayOrder: 47 },

  { code: 'FIELD_GOALS_MADE', name: 'Field Goals Made', shortName: 'FGM', category: 'KICKING', dataType: 'INTEGER', aggregationType: 'SUM', higherIsBetter: true, displayOrder: 50 },
  { code: 'FIELD_GOALS_ATTEMPTED', name: 'Field Goals Attempted', shortName: 'FGA', category: 'KICKING', dataType: 'INTEGER', aggregationType: 'SUM', higherIsBetter: true, displayOrder: 51 },
  { code: 'EXTRA_POINTS_MADE', name: 'Extra Points Made', shortName: 'XPM', category: 'KICKING', dataType: 'INTEGER', aggregationType: 'SUM', higherIsBetter: true, displayOrder: 52 },
  { code: 'EXTRA_POINTS_ATTEMPTED', name: 'Extra Points Attempted', shortName: 'XPA', category: 'KICKING', dataType: 'INTEGER', aggregationType: 'SUM', higherIsBetter: true, displayOrder: 53 },

  { code: 'PUNTS', name: 'Punts', shortName: 'PUNT', category: 'PUNTING', dataType: 'INTEGER', aggregationType: 'SUM', higherIsBetter: true, displayOrder: 60 },
  { code: 'PUNT_YARDS', name: 'Punt Yards', shortName: 'YDS', category: 'PUNTING', dataType: 'INTEGER', aggregationType: 'SUM', unit: 'yd', higherIsBetter: true, displayOrder: 61 },

  { code: 'KICK_RETURN_YARDS', name: 'Kick Return Yards', shortName: 'KR YDS', category: 'RETURNS', dataType: 'INTEGER', aggregationType: 'SUM', unit: 'yd', higherIsBetter: true, displayOrder: 70 },
  { code: 'PUNT_RETURN_YARDS', name: 'Punt Return Yards', shortName: 'PR YDS', category: 'RETURNS', dataType: 'INTEGER', aggregationType: 'SUM', unit: 'yd', higherIsBetter: true, displayOrder: 71 },
  { code: 'RETURN_TOUCHDOWNS', name: 'Return Touchdowns', shortName: 'RET TD', category: 'RETURNS', dataType: 'INTEGER', aggregationType: 'SUM', higherIsBetter: true, displayOrder: 72 },
];

export const FOOTBALL_PERFORMANCE_TESTS: Array<{
  code: string;
  name: string;
  measurementType: 'TIME' | 'DISTANCE' | 'HEIGHT' | 'WEIGHT' | 'COUNT';
  unit: string;
  lowerIsBetter: boolean;
  displayOrder: number;
  description?: string;
}> = [
  { code: 'FORTY_YARD_DASH', name: '40-Yard Dash', measurementType: 'TIME', unit: 's', lowerIsBetter: true, displayOrder: 1 },
  { code: 'TEN_YARD_SPLIT', name: '10-Yard Split', measurementType: 'TIME', unit: 's', lowerIsBetter: true, displayOrder: 2 },
  { code: 'TWENTY_YARD_SHUTTLE', name: '20-Yard Shuttle', measurementType: 'TIME', unit: 's', lowerIsBetter: true, displayOrder: 3 },
  { code: 'THREE_CONE_DRILL', name: '3-Cone Drill', measurementType: 'TIME', unit: 's', lowerIsBetter: true, displayOrder: 4 },
  { code: 'VERTICAL_JUMP', name: 'Vertical Jump', measurementType: 'HEIGHT', unit: 'cm', lowerIsBetter: false, displayOrder: 5 },
  { code: 'BROAD_JUMP', name: 'Broad Jump', measurementType: 'DISTANCE', unit: 'cm', lowerIsBetter: false, displayOrder: 6 },
  { code: 'BENCH_PRESS_REPS', name: 'Bench Press Reps', measurementType: 'COUNT', unit: 'reps', lowerIsBetter: false, displayOrder: 7, description: 'Repetitions at standard combine weight' },
];
