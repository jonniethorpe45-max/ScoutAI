import { z } from 'zod';
import {
  CommitmentStatus,
  ContactPolicy,
  OnboardingStage,
  ProfileVisibility,
  RecruitingStatus,
} from '@scoutai/domain';

const optionalTrimmed = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((value) => (value === '' ? null : value));

const dateOfBirthSchema = z
  .string()
  .trim()
  .refine(
    (value) =>
      /^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isNaN(Date.parse(value)),
    { message: 'Invalid dateOfBirth' },
  )
  .optional()
  .nullable();

export const createAthleteSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  middleName: optionalTrimmed,
  lastName: z.string().trim().min(1).max(100),
  preferredName: optionalTrimmed,
  displayName: z.string().trim().min(1).max(200).optional(),
  dateOfBirth: dateOfBirthSchema,
  city: optionalTrimmed,
  stateRegion: optionalTrimmed,
  countryCode: z.string().trim().length(2).optional(),
});

export const updateIdentitySchema = z.object({
  firstName: z.string().trim().min(1).max(100).optional(),
  middleName: optionalTrimmed,
  lastName: z.string().trim().min(1).max(100).optional(),
  preferredName: optionalTrimmed,
  displayName: z.string().trim().min(1).max(200).optional(),
  dateOfBirth: dateOfBirthSchema,
  city: optionalTrimmed,
  stateRegion: optionalTrimmed,
  countryCode: z.string().trim().length(2).optional(),
  postalCode: optionalTrimmed,
});

export const setSportSchema = z.object({
  sportCode: z.string().trim().min(1).max(50),
  isPrimary: z.boolean().optional().default(true),
  startYear: z.number().int().min(1990).max(2100).optional().nullable(),
});

export const setPositionsSchema = z.object({
  sportCode: z.string().trim().min(1).max(50),
  positions: z
    .array(
      z.object({
        positionCode: z.string().trim().min(1).max(50),
        isPrimary: z.boolean().optional().default(false),
        displayOrder: z.number().int().min(0).max(100).optional(),
      }),
    )
    .min(1)
    .max(20),
});

export const physicalSchema = z.object({
  heightCm: z.number().min(100).max(250).optional().nullable(),
  weightKg: z.number().min(30).max(250).optional().nullable(),
});

export const academicSchema = z.object({
  schoolName: optionalTrimmed,
  graduationYear: z.number().int().min(2000).max(2100).optional().nullable(),
  gpa: z.number().min(0).max(5).optional().nullable(),
  gpaScale: z.number().min(1).max(5).optional().nullable(),
  intendedMajor: optionalTrimmed,
});

export const recruitingSchema = z.object({
  recruitingStatus: z.nativeEnum(RecruitingStatus).optional(),
  commitmentStatus: z.nativeEnum(CommitmentStatus).optional(),
  committedOrganizationText: optionalTrimmed,
  recruitingBiography: z.string().trim().max(2000).optional().nullable(),
  preferredRegions: z.unknown().optional().nullable(),
  preferredCompetitionLevels: z.unknown().optional().nullable(),
  contactPolicy: z.nativeEnum(ContactPolicy).optional(),
});

export const visibilitySchema = z.object({
  profileVisibility: z.nativeEnum(ProfileVisibility),
});

export const biographySchema = z.object({
  biography: z.string().trim().max(2000).optional().nullable(),
});

export const schoolTeamSchema = z.object({
  schoolNameReported: optionalTrimmed,
  teamNameReported: optionalTrimmed,
  organizationId: z.string().uuid().optional().nullable(),
});

export const guardianInviteSchema = z.object({
  guardianEmail: z.string().trim().email(),
  relationshipType: z.string().trim().min(1).max(100),
  athleteId: z.string().uuid().optional(),
});

export const advanceOnboardingSchema = z.object({
  stage: z.nativeEnum(OnboardingStage),
});

export type CreateAthleteInput = z.infer<typeof createAthleteSchema>;
export type UpdateIdentityInput = z.infer<typeof updateIdentitySchema>;
export type SetSportInput = z.infer<typeof setSportSchema>;
export type SetPositionsInput = z.infer<typeof setPositionsSchema>;
export type PhysicalInput = z.infer<typeof physicalSchema>;
export type AcademicInput = z.infer<typeof academicSchema>;
export type RecruitingInput = z.infer<typeof recruitingSchema>;
export type VisibilityInput = z.infer<typeof visibilitySchema>;
export type BiographyInput = z.infer<typeof biographySchema>;
export type SchoolTeamInput = z.infer<typeof schoolTeamSchema>;
export type GuardianInviteInput = z.infer<typeof guardianInviteSchema>;
export type AdvanceOnboardingInput = z.infer<typeof advanceOnboardingSchema>;
