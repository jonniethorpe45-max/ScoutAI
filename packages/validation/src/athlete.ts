import { z } from 'zod';
import { OrganizationMemberRole } from '@scoutai/domain';

const optionalTrimmed = z
  .union([z.string().trim(), z.null()])
  .optional()
  .transform((value) => (value === undefined ? undefined : value === '' ? null : value));

export const upsertAthleteProfileSchema = z.object({
  displayName: z.string().trim().min(1).max(120),
  sport: z.string().trim().min(1).max(80).optional(),
  position: optionalTrimmed,
  graduationYear: z
    .union([z.number().int().min(2000).max(2100), z.null()])
    .optional(),
  highSchoolName: optionalTrimmed,
  heightInches: z.union([z.number().int().min(36).max(96), z.null()]).optional(),
  weightLbs: z.union([z.number().int().min(50).max(500), z.null()]).optional(),
  bio: z.union([z.string().trim().max(2000), z.null()]).optional(),
  contactEmail: z
    .union([z.string().trim().email(), z.null(), z.literal('')])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === '' ? null : value)),
  contactPhone: optionalTrimmed,
  city: optionalTrimmed,
  state: optionalTrimmed,
  dateOfBirth: z
    .union([
      z.string().datetime({ offset: true }),
      z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD'),
      z.null(),
    ])
    .optional(),
});

export const guardianInviteSchema = z.object({
  guardianEmail: z.string().trim().email(),
  relationshipType: z.string().trim().min(1).max(80),
});

export const addRosterMemberSchema = z.object({
  userId: z.string().uuid(),
  role: z
    .enum([
      OrganizationMemberRole.MEMBER,
      OrganizationMemberRole.COACH,
      OrganizationMemberRole.ADMIN,
    ])
    .optional(),
});

export type UpsertAthleteProfileInput = z.infer<typeof upsertAthleteProfileSchema>;
export type GuardianInviteInput = z.infer<typeof guardianInviteSchema>;
export type AddRosterMemberInput = z.infer<typeof addRosterMemberSchema>;
