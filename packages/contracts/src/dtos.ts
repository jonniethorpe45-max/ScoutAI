import type {
  GuardianRelationshipStatus,
  OrganizationMemberRole,
  OrganizationType,
  MembershipStatus,
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
  status?: UserStatus;
}

export interface HealthResponse {
  status: 'ok';
  service?: string;
  timestamp?: string;
}

export interface ReadyResponse {
  status: 'ok' | 'ready' | 'not_ready';
  checks: {
    postgres?: boolean;
    redis?: boolean;
    database?: boolean;
  };
  timestamp?: string;
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
  environment: string;
  service: string;
  nodeVersion: string;
  timestamp: string;
  version?: string;
  buildSha?: string;
  startedAt?: string;
}

/** Public athlete profile fields (safe for entitled recruiters / org members). */
export interface AthletePublicProfile {
  id: string;
  displayName: string;
  sport: string;
  position: string | null;
  graduationYear: number | null;
  highSchoolName: string | null;
  heightInches: number | null;
  weightLbs: number | null;
  bio: string | null;
  city: string | null;
  state: string | null;
}

/** Org-tier fields (coach / org admin within shared org). */
export interface AthleteOrgProfile extends AthletePublicProfile {
  rosterStatus?: MembershipStatus | null;
  organizationId?: string | null;
}

/** Restricted contact fields — owner, linked guardian, audit-logged admin. */
export interface AthleteRestrictedProfile extends AthleteOrgProfile {
  contactEmail: string | null;
  contactPhone: string | null;
  dateOfBirth: string | null;
}

export interface AthleteOwnerProfile extends AthleteRestrictedProfile {
  userId: string | null;
  createdAt: string;
  updatedAt: string;
}

export type AthleteProfileView =
  | { access: 'public'; profile: AthletePublicProfile }
  | { access: 'org'; profile: AthleteOrgProfile }
  | { access: 'restricted' | 'owner'; profile: AthleteOwnerProfile };

export interface UpsertAthleteProfileRequest {
  displayName: string;
  sport?: string;
  position?: string | null;
  graduationYear?: number | null;
  highSchoolName?: string | null;
  heightInches?: number | null;
  weightLbs?: number | null;
  bio?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  city?: string | null;
  state?: string | null;
  dateOfBirth?: string | null;
}

export interface GuardianInviteRequest {
  guardianEmail: string;
  relationshipType: string;
}

export interface GuardianLinkResponse {
  id: string;
  guardianUserId: string;
  athleteId: string;
  relationshipType: string;
  status: GuardianRelationshipStatus;
  invitedByUserId: string | null;
  consentGrantedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RosterMember {
  id: string;
  userId: string;
  email: string;
  role: OrganizationMemberRole;
  status: MembershipStatus;
  displayName: string | null;
  athleteId: string | null;
}

export interface OrganizationSummary {
  id: string;
  name: string;
  slug: string;
  type: OrganizationType;
  status: MembershipStatus;
}

export interface AddRosterMemberRequest {
  userId: string;
  role?: OrganizationMemberRole;
}
