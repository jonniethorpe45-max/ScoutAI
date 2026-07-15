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
