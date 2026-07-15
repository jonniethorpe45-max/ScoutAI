import type {
  AthleteOwnerView,
  AthletePublicView,
  CompletenessCheck,
  CompletenessResult,
} from '@scoutai/contracts';
import { decimalToNumber, isMinorAthlete } from './athlete.utils';

type AthleteGraph = {
  id: string;
  userId: string | null;
  slug: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  preferredName: string | null;
  displayName: string;
  dateOfBirth: Date | null;
  city: string | null;
  stateRegion: string | null;
  countryCode: string;
  postalCode: string | null;
  biography: string | null;
  profileStatus: string;
  profileVisibility: string;
  onboardingStage: string;
  publishedAt: Date | null;
  visibilitySetAt: Date | null;
  schoolNameReported: string | null;
  teamNameReported: string | null;
  organizationId: string | null;
  createdAt: Date;
  updatedAt: Date;
  sports: Array<{
    sportId: string;
    isPrimary: boolean;
    isActive: boolean;
    startYear: number | null;
    sport: { code: string; name: string };
  }>;
  positions: Array<{
    positionId: string;
    sportId: string;
    isPrimary: boolean;
    displayOrder: number;
    position: { code: string; name: string };
  }>;
  physicalProfile: {
    heightCm: { toNumber(): number } | number | null;
    weightKg: { toNumber(): number } | number | null;
    updatedAt: Date;
  } | null;
  academicProfile: {
    schoolName: string | null;
    graduationYear: number | null;
    gpa: { toNumber(): number } | number | null;
    gpaScale: { toNumber(): number } | number | null;
    intendedMajor: string | null;
    updatedAt: Date;
  } | null;
  recruitingProfile: {
    recruitingStatus: string;
    commitmentStatus: string;
    committedOrganizationText: string | null;
    recruitingBiography: string | null;
    preferredRegions: unknown;
    preferredCompetitionLevels: unknown;
    contactPolicy: string;
    updatedAt: Date;
  } | null;
};

function mapSports(athlete: AthleteGraph) {
  return athlete.sports.map((row) => ({
    sportId: row.sportId,
    sportCode: row.sport.code,
    sportName: row.sport.name,
    isPrimary: row.isPrimary,
    isActive: row.isActive,
    startYear: row.startYear,
  }));
}

function mapPositions(athlete: AthleteGraph) {
  return athlete.positions.map((row) => ({
    positionId: row.positionId,
    sportId: row.sportId,
    code: row.position.code,
    name: row.position.name,
    isPrimary: row.isPrimary,
    displayOrder: row.displayOrder,
  }));
}

export function mapOwnerView(athlete: AthleteGraph): AthleteOwnerView {
  return {
    id: athlete.id,
    userId: athlete.userId,
    slug: athlete.slug,
    firstName: athlete.firstName,
    middleName: athlete.middleName,
    lastName: athlete.lastName,
    preferredName: athlete.preferredName,
    displayName: athlete.displayName,
    dateOfBirth: athlete.dateOfBirth?.toISOString() ?? null,
    city: athlete.city,
    stateRegion: athlete.stateRegion,
    countryCode: athlete.countryCode,
    postalCode: athlete.postalCode,
    biography: athlete.biography,
    profileStatus: athlete.profileStatus,
    profileVisibility: athlete.profileVisibility,
    onboardingStage: athlete.onboardingStage,
    publishedAt: athlete.publishedAt?.toISOString() ?? null,
    visibilitySetAt: athlete.visibilitySetAt?.toISOString() ?? null,
    schoolNameReported: athlete.schoolNameReported,
    teamNameReported: athlete.teamNameReported,
    organizationId: athlete.organizationId,
    isMinor: isMinorAthlete(athlete.dateOfBirth),
    sports: mapSports(athlete),
    positions: mapPositions(athlete),
    physicalProfile: athlete.physicalProfile
      ? {
          heightCm: decimalToNumber(athlete.physicalProfile.heightCm),
          weightKg: decimalToNumber(athlete.physicalProfile.weightKg),
          updatedAt: athlete.physicalProfile.updatedAt.toISOString(),
        }
      : null,
    academicProfile: athlete.academicProfile
      ? {
          schoolName: athlete.academicProfile.schoolName,
          graduationYear: athlete.academicProfile.graduationYear,
          gpa: decimalToNumber(athlete.academicProfile.gpa),
          gpaScale: decimalToNumber(athlete.academicProfile.gpaScale),
          intendedMajor: athlete.academicProfile.intendedMajor,
          updatedAt: athlete.academicProfile.updatedAt.toISOString(),
        }
      : null,
    recruitingProfile: athlete.recruitingProfile
      ? {
          recruitingStatus: athlete.recruitingProfile.recruitingStatus,
          commitmentStatus: athlete.recruitingProfile.commitmentStatus,
          committedOrganizationText: athlete.recruitingProfile.committedOrganizationText,
          recruitingBiography: athlete.recruitingProfile.recruitingBiography,
          preferredRegions: athlete.recruitingProfile.preferredRegions,
          preferredCompetitionLevels: athlete.recruitingProfile.preferredCompetitionLevels,
          contactPolicy: athlete.recruitingProfile.contactPolicy,
          updatedAt: athlete.recruitingProfile.updatedAt.toISOString(),
        }
      : null,
    createdAt: athlete.createdAt.toISOString(),
    updatedAt: athlete.updatedAt.toISOString(),
  };
}

export function mapPublicView(athlete: AthleteGraph): AthletePublicView {
  return {
    id: athlete.id,
    slug: athlete.slug,
    displayName: athlete.displayName,
    preferredName: athlete.preferredName,
    city: athlete.city,
    stateRegion: athlete.stateRegion,
    countryCode: athlete.countryCode,
    biography: athlete.biography,
    profileStatus: athlete.profileStatus,
    profileVisibility: athlete.profileVisibility,
    schoolNameReported: athlete.schoolNameReported,
    teamNameReported: athlete.teamNameReported,
    sports: mapSports(athlete),
    positions: mapPositions(athlete),
    physicalProfile: athlete.physicalProfile
      ? {
          heightCm: decimalToNumber(athlete.physicalProfile.heightCm),
          weightKg: decimalToNumber(athlete.physicalProfile.weightKg),
        }
      : null,
    academicProfile: athlete.academicProfile
      ? {
          schoolName: athlete.academicProfile.schoolName,
          graduationYear: athlete.academicProfile.graduationYear,
          intendedMajor: athlete.academicProfile.intendedMajor,
        }
      : null,
    recruitingProfile: athlete.recruitingProfile
      ? {
          recruitingStatus: athlete.recruitingProfile.recruitingStatus,
          commitmentStatus: athlete.recruitingProfile.commitmentStatus,
          committedOrganizationText: athlete.recruitingProfile.committedOrganizationText,
          recruitingBiography: athlete.recruitingProfile.recruitingBiography,
        }
      : null,
  };
}

export function computeCompleteness(athlete: AthleteGraph): CompletenessResult {
  const hasPrimarySport = athlete.sports.some((s) => s.isPrimary && s.isActive);
  const hasPrimaryPosition = athlete.positions.some((p) => p.isPrimary);
  const hasGraduationYear = !!athlete.academicProfile?.graduationYear;
  const hasDisplayName = athlete.displayName.trim().length > 0;
  const hasVisibilityChosen = athlete.visibilitySetAt !== null;

  const checks: CompletenessCheck[] = [
    {
      key: 'displayName',
      label: 'Display name',
      satisfied: hasDisplayName,
      requiredForPublish: true,
    },
    {
      key: 'primarySport',
      label: 'Primary sport',
      satisfied: hasPrimarySport,
      requiredForPublish: true,
    },
    {
      key: 'primaryPosition',
      label: 'Primary position',
      satisfied: hasPrimaryPosition,
      requiredForPublish: true,
    },
    {
      key: 'graduationYear',
      label: 'Graduation year',
      satisfied: hasGraduationYear,
      requiredForPublish: true,
    },
    {
      key: 'visibilityChosen',
      label: 'Profile visibility explicitly set',
      satisfied: hasVisibilityChosen,
      requiredForPublish: true,
    },
    {
      key: 'biography',
      label: 'Biography',
      satisfied: !!athlete.biography && athlete.biography.trim().length > 0,
      requiredForPublish: false,
    },
    {
      key: 'physical',
      label: 'Physical profile',
      satisfied:
        !!athlete.physicalProfile &&
        (athlete.physicalProfile.heightCm != null || athlete.physicalProfile.weightKg != null),
      requiredForPublish: false,
    },
  ];

  const satisfiedChecks = checks.filter((check) => check.satisfied).length;
  const readyToPublish = checks
    .filter((check) => check.requiredForPublish)
    .every((check) => check.satisfied);

  return {
    score: Math.round((satisfiedChecks / checks.length) * 100),
    totalChecks: checks.length,
    satisfiedChecks,
    readyToPublish,
    checks,
  };
}
