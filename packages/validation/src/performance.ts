import { z } from 'zod';
import {
  AthleteSeasonStatus,
  GameStatus,
  ParticipationStatus,
  SeasonStatus,
} from '@scoutai/domain';

const nonEmpty = z.string().trim().min(1).max(200);
const optionalString = z.string().trim().max(200).optional().nullable();
const uuid = z.string().uuid();

export const createSeasonSchema = z.object({
  sportCode: z.string().trim().min(2).max(32),
  name: nonEmpty.max(120),
  year: z.number().int().min(1950).max(2100),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
  status: z.nativeEnum(SeasonStatus).optional(),
});
export type CreateSeasonInput = z.infer<typeof createSeasonSchema>;

export const createAthleteSeasonSchema = z.object({
  seasonId: uuid,
  selfReportedTeamName: optionalString,
  jerseyNumber: z.string().trim().max(10).optional().nullable(),
  primaryPositionId: uuid.optional().nullable(),
  organizationId: uuid.optional().nullable(),
  status: z.nativeEnum(AthleteSeasonStatus).optional(),
});
export type CreateAthleteSeasonInput = z.infer<typeof createAthleteSeasonSchema>;

export const updateAthleteSeasonSchema = z.object({
  selfReportedTeamName: optionalString,
  jerseyNumber: z.string().trim().max(10).optional().nullable(),
  primaryPositionId: uuid.optional().nullable(),
  organizationId: uuid.optional().nullable(),
  status: z.nativeEnum(AthleteSeasonStatus).optional(),
});
export type UpdateAthleteSeasonInput = z.infer<typeof updateAthleteSeasonSchema>;

export const createGameSchema = z.object({
  seasonId: uuid,
  scheduledStart: z.string().datetime(),
  timezone: z.string().trim().min(1).max(64).optional(),
  status: z.nativeEnum(GameStatus).optional(),
  homeTeamName: nonEmpty.max(120),
  awayTeamName: nonEmpty.max(120),
  athleteTeamSide: z.enum(['HOME', 'AWAY', 'UNKNOWN']).optional(),
  locationName: optionalString,
  city: optionalString,
  stateRegion: optionalString,
  countryCode: z.string().trim().length(2).optional().nullable(),
  homeScore: z.number().int().min(0).max(999).optional().nullable(),
  awayScore: z.number().int().min(0).max(999).optional().nullable(),
  participationStatus: z.nativeEnum(ParticipationStatus).optional(),
  jerseyNumber: z.string().trim().max(10).optional().nullable(),
  starter: z.boolean().optional().nullable(),
  athleteSeasonId: uuid.optional().nullable(),
  forceDuplicate: z.boolean().optional(),
});
export type CreateGameInput = z.infer<typeof createGameSchema>;

export const updateGameSchema = z.object({
  scheduledStart: z.string().datetime().optional(),
  timezone: z.string().trim().min(1).max(64).optional(),
  status: z.nativeEnum(GameStatus).optional(),
  homeTeamName: nonEmpty.max(120).optional(),
  awayTeamName: nonEmpty.max(120).optional(),
  locationName: optionalString,
  city: optionalString,
  stateRegion: optionalString,
  countryCode: z.string().trim().length(2).optional().nullable(),
  homeScore: z.number().int().min(0).max(999).optional().nullable(),
  awayScore: z.number().int().min(0).max(999).optional().nullable(),
});
export type UpdateGameInput = z.infer<typeof updateGameSchema>;

export const upsertParticipationSchema = z.object({
  participationStatus: z.nativeEnum(ParticipationStatus),
  jerseyNumber: z.string().trim().max(10).optional().nullable(),
  starter: z.boolean().optional().nullable(),
  athleteSeasonId: uuid.optional().nullable(),
  athleteTeamSide: z.enum(['HOME', 'AWAY', 'UNKNOWN']).optional(),
});
export type UpsertParticipationInput = z.infer<typeof upsertParticipationSchema>;

export const upsertGameStatisticsSchema = z.object({
  statistics: z
    .array(
      z.object({
        statisticCode: z.string().trim().min(1).max(64),
        numericValue: z.number().finite(),
      }),
    )
    .min(1)
    .max(50),
});
export type UpsertGameStatisticsInput = z.infer<typeof upsertGameStatisticsSchema>;

export const createPerformanceResultSchema = z.object({
  testCode: z.string().trim().min(1).max(64),
  numericValue: z.number().finite().positive(),
  performedAt: z.string().datetime(),
  eventName: optionalString,
  locationName: optionalString,
  notes: z.string().trim().max(2000).optional().nullable(),
});
export type CreatePerformanceResultInput = z.infer<typeof createPerformanceResultSchema>;
