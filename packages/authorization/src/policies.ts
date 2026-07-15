import {
  ProfileStatus,
  ProfileVisibility,
  UserRoleType,
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

export interface PublicAthleteViewContext {
  visibility: ProfileVisibility | string;
  profileStatus: ProfileStatus | string;
  athleteUserId: string | null;
  hasActiveGuardianLink: boolean;
}

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
  if (
    !hasRole(subject, UserRoleType.ATHLETE) &&
    !isScoutAiAdmin(subject)
  ) {
    return { allowed: false, reason: 'Athlete role required to create a profile' };
  }
  return { allowed: true };
}

export function canEditOwnAthleteProfile(
  subject: AuthorizationSubject | null | undefined,
  athleteUserId: string | null | undefined,
): AuthorizationResult {
  const auth = assertAuthenticated(subject);
  if (!auth.allowed) {
    return auth;
  }
  if (isScoutAiAdmin(subject)) {
    return { allowed: true };
  }
  if (!athleteUserId || subject!.id !== athleteUserId) {
    return { allowed: false, reason: 'Only the athlete owner can edit this profile' };
  }
  return { allowed: true };
}

export function canViewAthleteOwnerData(
  subject: AuthorizationSubject | null | undefined,
  athleteUserId: string | null | undefined,
  options?: { hasActiveGuardianLink?: boolean },
): AuthorizationResult {
  const auth = assertAuthenticated(subject);
  if (!auth.allowed) {
    return auth;
  }
  if (isScoutAiAdmin(subject)) {
    return { allowed: true };
  }
  if (athleteUserId && subject!.id === athleteUserId) {
    return { allowed: true };
  }
  if (
    options?.hasActiveGuardianLink &&
    hasRole(subject, UserRoleType.GUARDIAN)
  ) {
    return { allowed: true };
  }
  return { allowed: false, reason: 'Owner or linked guardian access required' };
}

export function canViewPublicAthleteProfile(
  subject: AuthorizationSubject | null | undefined,
  context: PublicAthleteViewContext,
): AuthorizationResult {
  if (isScoutAiAdmin(subject)) {
    return { allowed: true };
  }

  if (context.athleteUserId && subject?.id === context.athleteUserId) {
    return { allowed: true };
  }

  if (context.hasActiveGuardianLink && hasRole(subject, UserRoleType.GUARDIAN)) {
    return { allowed: true };
  }

  const isPublished = context.profileStatus === ProfileStatus.PUBLISHED;
  if (!isPublished) {
    return { allowed: false, reason: 'Athlete profile is not published' };
  }

  if (context.visibility === ProfileVisibility.PUBLIC) {
    return { allowed: true };
  }

  if (context.visibility === ProfileVisibility.PRIVATE) {
    return { allowed: false, reason: 'Athlete profile is private' };
  }

  if (context.visibility === ProfileVisibility.CONNECTIONS) {
    if (!subject) {
      return { allowed: false, reason: 'Authentication required for connections-only profiles' };
    }
    // Stage 4: authenticated viewers with any platform role may view CONNECTIONS profiles.
    // Entitlement-scoped recruiter access is a later stage.
    return { allowed: true };
  }

  return { allowed: false, reason: 'Athlete profile is not publicly visible' };
}

export function canManageGuardianLink(
  subject: AuthorizationSubject | null | undefined,
  options: {
    athleteUserId?: string | null;
    guardianUserId?: string | null;
    isInviteAction?: boolean;
  },
): AuthorizationResult {
  const auth = assertAuthenticated(subject);
  if (!auth.allowed) {
    return auth;
  }
  if (isScoutAiAdmin(subject)) {
    return { allowed: true };
  }

  const isAthleteOwner =
    !!options.athleteUserId && subject!.id === options.athleteUserId;
  const isGuardianParty =
    !!options.guardianUserId && subject!.id === options.guardianUserId;

  if (options.isInviteAction) {
    if (isAthleteOwner || (hasRole(subject, UserRoleType.GUARDIAN) && isGuardianParty)) {
      return { allowed: true };
    }
    return { allowed: false, reason: 'Only athlete owner or guardian can manage invites' };
  }

  if (isAthleteOwner || isGuardianParty) {
    return { allowed: true };
  }

  return { allowed: false, reason: 'Not a party to this guardian link' };
}

export function canPublishAthleteProfile(
  subject: AuthorizationSubject | null | undefined,
  athleteUserId: string | null | undefined,
): AuthorizationResult {
  return canEditOwnAthleteProfile(subject, athleteUserId);
}
