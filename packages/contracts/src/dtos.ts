import type {
  CommitmentStatus,
  ContactPolicy,
  OnboardingStage,
  ProfileStatus,
  ProfileVisibility,
  RecruitingStatus,
  UserRoleType,
  UserStatus,
} from '@scoutai/domain';

export interface ApiErrorBody {
  code: string;
  message: string;
  requestId: string;
}

export interface ApiErrorResponse {
  error: ApiErrorBody;
}

export interface PublicUser {
  id: string;
  email: string;
  status: UserStatus;
  roles: UserRoleType[];
  createdAt: string;
  updatedAt: string;
}

export interface AuthSessionUser {
  id: string;
  email: string;
  roles: UserRoleType[];
}

export interface HealthResponse {
  status: 'ok';
  timestamp: string;
}

export interface ReadyResponse {
  status: 'ready' | 'not_ready';
  checks: {
    database: boolean;
    redis: boolean;
  };
  timestamp: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface MeResponse {
  user: AuthSessionUser;
}

export interface SystemInfoResponse {
  version: string;
  environment: string;
  buildSha?: string;
  startedAt: string;
}

export interface SportDto {
  id: string;
  code: string;
  name: string;
  status: string;
}

export interface PositionDto {
  id: string;
  sportId: string;
  code: string;
  name: string;
  displayOrder: number;
}

export interface AthleteSportDto {
  sportId: string;
  sportCode: string;
  sportName: string;
  isPrimary: boolean;
  isActive: boolean;
  startYear: number | null;
}

export interface AthletePositionDto {
  positionId: string;
  sportId: string;
  code: string;
  name: string;
  isPrimary: boolean;
  displayOrder: number;
}

export interface AthletePhysicalDto {
  heightCm: number | null;
  weightKg: number | null;
  updatedAt: string;
}

export interface AthleteAcademicDto {
  schoolName: string | null;
  graduationYear: number | null;
  gpa: number | null;
  gpaScale: number | null;
  intendedMajor: string | null;
  updatedAt: string;
}

export interface AthleteRecruitingDto {
  recruitingStatus: RecruitingStatus | string;
  commitmentStatus: CommitmentStatus | string;
  committedOrganizationText: string | null;
  recruitingBiography: string | null;
  preferredRegions: unknown;
  preferredCompetitionLevels: unknown;
  contactPolicy: ContactPolicy | string;
  updatedAt: string;
}

/** Owner/guardian view — may include restricted fields. Never includes password. */
export interface AthleteOwnerView {
  id: string;
  userId: string | null;
  slug: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  preferredName: string | null;
  displayName: string;
  dateOfBirth: string | null;
  city: string | null;
  stateRegion: string | null;
  countryCode: string;
  postalCode: string | null;
  biography: string | null;
  profileStatus: ProfileStatus | string;
  profileVisibility: ProfileVisibility | string;
  onboardingStage: OnboardingStage | string;
  publishedAt: string | null;
  visibilitySetAt: string | null;
  schoolNameReported: string | null;
  teamNameReported: string | null;
  organizationId: string | null;
  isMinor: boolean;
  sports: AthleteSportDto[];
  positions: AthletePositionDto[];
  physicalProfile: AthletePhysicalDto | null;
  academicProfile: AthleteAcademicDto | null;
  recruitingProfile: AthleteRecruitingDto | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Public profile view.
 * NEVER includes: email, dateOfBirth, postalCode, guardian emails,
 * contactPolicy private details, password, or other restricted PII.
 */
export interface AthletePublicView {
  id: string;
  slug: string;
  displayName: string;
  preferredName: string | null;
  city: string | null;
  stateRegion: string | null;
  countryCode: string;
  biography: string | null;
  profileStatus: ProfileStatus | string;
  profileVisibility: ProfileVisibility | string;
  schoolNameReported: string | null;
  teamNameReported: string | null;
  sports: AthleteSportDto[];
  positions: AthletePositionDto[];
  physicalProfile: Pick<AthletePhysicalDto, 'heightCm' | 'weightKg'> | null;
  academicProfile: Pick<
    AthleteAcademicDto,
    'schoolName' | 'graduationYear' | 'intendedMajor'
  > | null;
  recruitingProfile: {
    recruitingStatus: RecruitingStatus | string;
    commitmentStatus: CommitmentStatus | string;
    committedOrganizationText: string | null;
    recruitingBiography: string | null;
  } | null;
}

export interface CompletenessCheck {
  key: string;
  label: string;
  satisfied: boolean;
  requiredForPublish: boolean;
}

export interface CompletenessResult {
  score: number;
  totalChecks: number;
  satisfiedChecks: number;
  readyToPublish: boolean;
  checks: CompletenessCheck[];
}

export interface OnboardingStatus {
  stage: OnboardingStage | string;
  completeness: CompletenessResult;
  isMinor: boolean;
  /** LEGAL REVIEW REQUIRED — DOB-based minor gating is provisional platform policy. */
  minorPolicyNote: string;
}

export interface PublishResult {
  published: boolean;
  profileStatus: ProfileStatus | string;
  publishedAt: string | null;
  completeness: CompletenessResult;
}
