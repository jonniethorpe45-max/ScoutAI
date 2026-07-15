import {
  OrganizationMemberRole,
  UserRoleType,
  type OrganizationMemberRole as OrgRole,
  type UserRoleType as UserRole,
} from '@scoutai/domain';

export interface AuthorizationSubject {
  id: string;
  roles: UserRole[];
}

export interface AuthorizationResult {
  allowed: boolean;
  reason?: string;
}

/** Context for athlete profile reads — relationship facts resolved by the service layer. */
export interface AthleteAccessContext {
  athleteUserId: string | null;
  hasActiveGuardianLink: boolean;
  sharesActiveOrgMembership: boolean;
  viewerOrgRole?: OrgRole | null;
}

export type AthleteProfileAccessLevel = 'none' | 'public' | 'org' | 'restricted' | 'owner';

export function hasRole(subject: AuthorizationSubject | null | undefined, role: UserRole): boolean {
  if (!subject) {
    return false;
  }
  return subject.roles.includes(role);
}

export function isScoutAiAdmin(subject: AuthorizationSubject | null | undefined): boolean {
  return hasRole(subject, UserRoleType.SCOUTAI_ADMIN);
}

export function assertAuthenticated(
  subject: AuthorizationSubject | null | undefined,
): AuthorizationResult {
  if (!subject) {
    return { allowed: false, reason: 'Authentication required' };
  }
  return { allowed: true };
}

export function canViewAdminSystemInfo(
  subject: AuthorizationSubject | null | undefined,
): AuthorizationResult {
  const auth = assertAuthenticated(subject);
  if (!auth.allowed) {
    return auth;
  }
  if (!isScoutAiAdmin(subject)) {
    return { allowed: false, reason: 'ScoutAI admin role required' };
  }
  return { allowed: true };
}

export function canCreateOwnAthleteProfile(
  subject: AuthorizationSubject | null | undefined,
): AuthorizationResult {
  const auth = assertAuthenticated(subject);
  if (!auth.allowed) {
    return auth;
  }
  if (!hasRole(subject, UserRoleType.ATHLETE) && !isScoutAiAdmin(subject)) {
    return { allowed: false, reason: 'Athlete role required to create an athlete profile' };
  }
  return { allowed: true };
}

export function canEditOwnAthleteProfile(
  subject: AuthorizationSubject | null | undefined,
  athleteUserId: string | null,
): AuthorizationResult {
  const auth = assertAuthenticated(subject);
  if (!auth.allowed) {
    return auth;
  }
  if (isScoutAiAdmin(subject)) {
    return { allowed: true };
  }
  if (!athleteUserId || subject!.id !== athleteUserId) {
    return { allowed: false, reason: 'Athletes may only edit their own profile' };
  }
  return { allowed: true };
}

/**
 * Resolve the maximum field tier a viewer may see for an athlete profile.
 * Deny-by-default for unrelated authenticated users.
 */
export function resolveAthleteProfileAccess(
  subject: AuthorizationSubject | null | undefined,
  context: AthleteAccessContext,
): AthleteProfileAccessLevel {
  if (!subject) {
    return 'none';
  }

  if (isScoutAiAdmin(subject)) {
    return 'restricted';
  }

  if (context.athleteUserId && subject.id === context.athleteUserId) {
    return 'owner';
  }

  if (context.hasActiveGuardianLink && hasRole(subject, UserRoleType.GUARDIAN)) {
    return 'restricted';
  }

  if (context.sharesActiveOrgMembership) {
    const role = context.viewerOrgRole;
    if (role === OrganizationMemberRole.ADMIN || role === OrganizationMemberRole.COACH) {
      return 'org';
    }
    if (role === OrganizationMemberRole.MEMBER) {
      return 'public';
    }
    return 'public';
  }

  // Stage 4 entitlement hook: recruiter role grants public-field read only.
  if (hasRole(subject, UserRoleType.RECRUITER)) {
    return 'public';
  }

  return 'none';
}

export function canViewAthleteProfile(
  subject: AuthorizationSubject | null | undefined,
  context: AthleteAccessContext,
): AuthorizationResult {
  const auth = assertAuthenticated(subject);
  if (!auth.allowed) {
    return auth;
  }
  const level = resolveAthleteProfileAccess(subject, context);
  if (level === 'none') {
    return { allowed: false, reason: 'Not entitled to view this athlete profile' };
  }
  return { allowed: true };
}

export function canManageGuardianLink(
  subject: AuthorizationSubject | null | undefined,
  opts: {
    athleteUserId: string | null;
    guardianUserId: string;
    asInviter?: boolean;
  },
): AuthorizationResult {
  const auth = assertAuthenticated(subject);
  if (!auth.allowed) {
    return auth;
  }
  if (isScoutAiAdmin(subject)) {
    return { allowed: true };
  }
  if (opts.athleteUserId && subject!.id === opts.athleteUserId) {
    return { allowed: true };
  }
  if (subject!.id === opts.guardianUserId) {
    return { allowed: true };
  }
  return { allowed: false, reason: 'Only the athlete, linked guardian, or admin may manage this link' };
}

export function canViewOrganizationRoster(
  subject: AuthorizationSubject | null | undefined,
  membership: { role: OrgRole; status: string } | null,
): AuthorizationResult {
  const auth = assertAuthenticated(subject);
  if (!auth.allowed) {
    return auth;
  }
  if (isScoutAiAdmin(subject)) {
    return { allowed: true };
  }
  if (!membership || membership.status !== 'ACTIVE') {
    return { allowed: false, reason: 'Active organization membership required' };
  }
  if (
    membership.role === OrganizationMemberRole.COACH ||
    membership.role === OrganizationMemberRole.ADMIN
  ) {
    return { allowed: true };
  }
  return { allowed: false, reason: 'Coach or org admin role required to view roster' };
}

export function canManageOrganizationRoster(
  subject: AuthorizationSubject | null | undefined,
  membership: { role: OrgRole; status: string } | null,
): AuthorizationResult {
  const auth = assertAuthenticated(subject);
  if (!auth.allowed) {
    return auth;
  }
  if (isScoutAiAdmin(subject)) {
    return { allowed: true };
  }
  if (!membership || membership.status !== 'ACTIVE') {
    return { allowed: false, reason: 'Active organization membership required' };
  }
  if (membership.role === OrganizationMemberRole.ADMIN) {
    return { allowed: true };
  }
  if (
    membership.role === OrganizationMemberRole.COACH &&
    (hasRole(subject, UserRoleType.COACH) || hasRole(subject, UserRoleType.ORGANIZATION_ADMIN))
  ) {
    return { allowed: true };
  }
  return { allowed: false, reason: 'Org admin or coach required to manage roster' };
}
