export const UserStatus = {
  ACTIVE: 'ACTIVE',
  DISABLED: 'DISABLED',
  PENDING: 'PENDING',
} as const;
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

export const UserRoleType = {
  ATHLETE: 'ATHLETE',
  GUARDIAN: 'GUARDIAN',
  RECRUITER: 'RECRUITER',
  COACH: 'COACH',
  ORGANIZATION_ADMIN: 'ORGANIZATION_ADMIN',
  SCOUTAI_ADMIN: 'SCOUTAI_ADMIN',
} as const;
export type UserRoleType = (typeof UserRoleType)[keyof typeof UserRoleType];

export const OrganizationType = {
  HIGH_SCHOOL: 'HIGH_SCHOOL',
  CLUB: 'CLUB',
  COLLEGE_PROGRAM: 'COLLEGE_PROGRAM',
  OTHER: 'OTHER',
} as const;
export type OrganizationType = (typeof OrganizationType)[keyof typeof OrganizationType];

export const MembershipStatus = {
  ACTIVE: 'ACTIVE',
  INVITED: 'INVITED',
  REMOVED: 'REMOVED',
} as const;
export type MembershipStatus = (typeof MembershipStatus)[keyof typeof MembershipStatus];

export const RecruiterVerificationStatus = {
  UNVERIFIED: 'UNVERIFIED',
  PENDING: 'PENDING',
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED',
} as const;
export type RecruiterVerificationStatus =
  (typeof RecruiterVerificationStatus)[keyof typeof RecruiterVerificationStatus];

export const GuardianRelationshipStatus = {
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
  REVOKED: 'REVOKED',
} as const;
export type GuardianRelationshipStatus =
  (typeof GuardianRelationshipStatus)[keyof typeof GuardianRelationshipStatus];

export const OrganizationMemberRole = {
  MEMBER: 'MEMBER',
  COACH: 'COACH',
  ADMIN: 'ADMIN',
} as const;
export type OrganizationMemberRole =
  (typeof OrganizationMemberRole)[keyof typeof OrganizationMemberRole];

export const ProfileStatus = {
  DRAFT: 'DRAFT',
  ACTIVE: 'ACTIVE',
  PUBLISHED: 'PUBLISHED',
  ARCHIVED: 'ARCHIVED',
} as const;
export type ProfileStatus = (typeof ProfileStatus)[keyof typeof ProfileStatus];

export const ProfileVisibility = {
  PRIVATE: 'PRIVATE',
  CONNECTIONS: 'CONNECTIONS',
  PUBLIC: 'PUBLIC',
} as const;
export type ProfileVisibility = (typeof ProfileVisibility)[keyof typeof ProfileVisibility];

export const SportStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const;
export type SportStatus = (typeof SportStatus)[keyof typeof SportStatus];

export const OnboardingStage = {
  ACCOUNT_READY: 'ACCOUNT_READY',
  IDENTITY: 'IDENTITY',
  SPORT: 'SPORT',
  ACADEMIC: 'ACADEMIC',
  RECRUITING: 'RECRUITING',
  VISIBILITY: 'VISIBILITY',
  COMPLETE: 'COMPLETE',
} as const;
export type OnboardingStage = (typeof OnboardingStage)[keyof typeof OnboardingStage];

export const RecruitingStatus = {
  UNDECIDED: 'UNDECIDED',
  OPEN: 'OPEN',
  CLOSED: 'CLOSED',
  COMMITTED: 'COMMITTED',
} as const;
export type RecruitingStatus = (typeof RecruitingStatus)[keyof typeof RecruitingStatus];

export const CommitmentStatus = {
  NONE: 'NONE',
  VERBAL: 'VERBAL',
  WRITTEN: 'WRITTEN',
  SIGNED: 'SIGNED',
} as const;
export type CommitmentStatus = (typeof CommitmentStatus)[keyof typeof CommitmentStatus];

export const ContactPolicy = {
  OPEN: 'OPEN',
  GUARDIAN_ONLY: 'GUARDIAN_ONLY',
  CLOSED: 'CLOSED',
} as const;
export type ContactPolicy = (typeof ContactPolicy)[keyof typeof ContactPolicy];

export const GuardianInviteStatus = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  REVOKED: 'REVOKED',
  EXPIRED: 'EXPIRED',
} as const;
export type GuardianInviteStatus =
  (typeof GuardianInviteStatus)[keyof typeof GuardianInviteStatus];

/**
 * Platform policy: athletes under this age are treated as minors.
 * LEGAL REVIEW REQUIRED before production use of DOB-based minor gating.
 */
export const MINOR_AGE_THRESHOLD_YEARS = 18 as const;

export const SeasonStatus = {
  UPCOMING: 'UPCOMING',
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  ARCHIVED: 'ARCHIVED',
} as const;
export type SeasonStatus = (typeof SeasonStatus)[keyof typeof SeasonStatus];

export const AthleteSeasonStatus = {
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  ARCHIVED: 'ARCHIVED',
} as const;
export type AthleteSeasonStatus =
  (typeof AthleteSeasonStatus)[keyof typeof AthleteSeasonStatus];

export const GameStatus = {
  SCHEDULED: 'SCHEDULED',
  PRE_GAME: 'PRE_GAME',
  LIVE: 'LIVE',
  DELAYED: 'DELAYED',
  POSTPONED: 'POSTPONED',
  CANCELLED: 'CANCELLED',
  COMPLETED: 'COMPLETED',
} as const;
export type GameStatus = (typeof GameStatus)[keyof typeof GameStatus];

export const ParticipationStatus = {
  ROSTERED: 'ROSTERED',
  EXPECTED: 'EXPECTED',
  CONFIRMED_ACTIVE: 'CONFIRMED_ACTIVE',
  PARTICIPATED: 'PARTICIPATED',
  DID_NOT_PARTICIPATE: 'DID_NOT_PARTICIPATE',
  UNKNOWN: 'UNKNOWN',
} as const;
export type ParticipationStatus =
  (typeof ParticipationStatus)[keyof typeof ParticipationStatus];

export const StatisticDataType = {
  INTEGER: 'INTEGER',
  DECIMAL: 'DECIMAL',
  PERCENTAGE: 'PERCENTAGE',
} as const;
export type StatisticDataType =
  (typeof StatisticDataType)[keyof typeof StatisticDataType];

export const StatisticAggregationType = {
  SUM: 'SUM',
  AVERAGE: 'AVERAGE',
  MAX: 'MAX',
  MIN: 'MIN',
  LATEST: 'LATEST',
  DERIVED: 'DERIVED',
} as const;
export type StatisticAggregationType =
  (typeof StatisticAggregationType)[keyof typeof StatisticAggregationType];

export const StatisticCategory = {
  PASSING: 'PASSING',
  RUSHING: 'RUSHING',
  RECEIVING: 'RECEIVING',
  DEFENSE: 'DEFENSE',
  KICKING: 'KICKING',
  PUNTING: 'PUNTING',
  RETURNS: 'RETURNS',
  OTHER: 'OTHER',
} as const;
export type StatisticCategory =
  (typeof StatisticCategory)[keyof typeof StatisticCategory];

export const MeasurementType = {
  TIME: 'TIME',
  DISTANCE: 'DISTANCE',
  HEIGHT: 'HEIGHT',
  WEIGHT: 'WEIGHT',
  COUNT: 'COUNT',
} as const;
export type MeasurementType = (typeof MeasurementType)[keyof typeof MeasurementType];

export const DataSourceType = {
  SELF_REPORTED: 'SELF_REPORTED',
  COACH_REPORTED: 'COACH_REPORTED',
  ORGANIZATION_REPORTED: 'ORGANIZATION_REPORTED',
  IMPORTED: 'IMPORTED',
  SOURCE_VERIFIED: 'SOURCE_VERIFIED',
  SCOUTAI_VERIFIED: 'SCOUTAI_VERIFIED',
} as const;
export type DataSourceType = (typeof DataSourceType)[keyof typeof DataSourceType];

export const VerificationStatus = {
  UNVERIFIED: 'UNVERIFIED',
  PENDING: 'PENDING',
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED',
  EXPIRED: 'EXPIRED',
  REVOKED: 'REVOKED',
} as const;
export type VerificationStatus =
  (typeof VerificationStatus)[keyof typeof VerificationStatus];

/** Athlete cannot self-assign these source types. */
export const ATHLETE_ALLOWED_SOURCE_TYPES = [DataSourceType.SELF_REPORTED] as const;

/** Position → recommended statistic categories (UI guidance only; not authz). */
export const FOOTBALL_POSITION_STAT_CATEGORIES: Record<string, StatisticCategory[]> = {
  QB: [StatisticCategory.PASSING, StatisticCategory.RUSHING],
  RB: [StatisticCategory.RUSHING, StatisticCategory.RECEIVING],
  WR: [StatisticCategory.RECEIVING, StatisticCategory.RUSHING],
  TE: [StatisticCategory.RECEIVING, StatisticCategory.RUSHING],
  DL: [StatisticCategory.DEFENSE],
  EDGE: [StatisticCategory.DEFENSE],
  LB: [StatisticCategory.DEFENSE],
  CB: [StatisticCategory.DEFENSE],
  S: [StatisticCategory.DEFENSE],
  K: [StatisticCategory.KICKING],
  P: [StatisticCategory.PUNTING],
  ATH: [
    StatisticCategory.PASSING,
    StatisticCategory.RUSHING,
    StatisticCategory.RECEIVING,
    StatisticCategory.DEFENSE,
  ],
};
