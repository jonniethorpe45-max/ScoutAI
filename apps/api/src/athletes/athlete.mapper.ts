import type {
  AthleteOrgProfile,
  AthleteOwnerProfile,
  AthleteProfileView,
  AthletePublicProfile,
} from '@scoutai/contracts';
import type { AthleteProfileAccessLevel } from '@scoutai/authorization';
import type { Athlete, MembershipStatus } from '@scoutai/database';

type AthleteRow = Athlete & {
  rosterStatus?: MembershipStatus | null;
  organizationId?: string | null;
};

function toPublic(athlete: AthleteRow): AthletePublicProfile {
  return {
    id: athlete.id,
    displayName: athlete.displayName,
    sport: athlete.sport,
    position: athlete.position,
    graduationYear: athlete.graduationYear,
    highSchoolName: athlete.highSchoolName,
    heightInches: athlete.heightInches,
    weightLbs: athlete.weightLbs,
    bio: athlete.bio,
    city: athlete.city,
    state: athlete.state,
  };
}

function toOrg(athlete: AthleteRow): AthleteOrgProfile {
  return {
    ...toPublic(athlete),
    rosterStatus: athlete.rosterStatus ?? null,
    organizationId: athlete.organizationId ?? null,
  };
}

function toOwner(athlete: AthleteRow): AthleteOwnerProfile {
  return {
    ...toOrg(athlete),
    contactEmail: athlete.contactEmail,
    contactPhone: athlete.contactPhone,
    dateOfBirth: athlete.dateOfBirth ? athlete.dateOfBirth.toISOString() : null,
    userId: athlete.userId,
    createdAt: athlete.createdAt.toISOString(),
    updatedAt: athlete.updatedAt.toISOString(),
  };
}

export function mapAthleteProfileView(
  athlete: AthleteRow,
  access: Exclude<AthleteProfileAccessLevel, 'none'>,
): AthleteProfileView {
  if (access === 'public') {
    return { access: 'public', profile: toPublic(athlete) };
  }
  if (access === 'org') {
    return { access: 'org', profile: toOrg(athlete) };
  }
  return { access, profile: toOwner(athlete) };
}
