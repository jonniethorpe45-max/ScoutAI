import { describe, expect, it } from 'vitest';
import { OrganizationMemberRole, UserRoleType } from '@scoutai/domain';
import {
  assertAuthenticated,
  canCreateOwnAthleteProfile,
  canEditOwnAthleteProfile,
  canManageOrganizationRoster,
  canViewAdminSystemInfo,
  canViewAthleteProfile,
  canViewOrganizationRoster,
  hasRole,
  resolveAthleteProfileAccess,
} from './policies';

describe('authorization policies', () => {
  const admin = { id: '1', roles: [UserRoleType.SCOUTAI_ADMIN] };
  const athlete = { id: '2', roles: [UserRoleType.ATHLETE] };
  const guardian = { id: '3', roles: [UserRoleType.GUARDIAN] };
  const recruiter = { id: '4', roles: [UserRoleType.RECRUITER] };
  const coach = { id: '5', roles: [UserRoleType.COACH] };

  it('detects roles', () => {
    expect(hasRole(admin, UserRoleType.SCOUTAI_ADMIN)).toBe(true);
    expect(hasRole(athlete, UserRoleType.SCOUTAI_ADMIN)).toBe(false);
  });

  it('requires authentication', () => {
    expect(assertAuthenticated(null).allowed).toBe(false);
    expect(assertAuthenticated(athlete).allowed).toBe(true);
  });

  it('restricts admin system info', () => {
    expect(canViewAdminSystemInfo(admin).allowed).toBe(true);
    expect(canViewAdminSystemInfo(athlete).allowed).toBe(false);
  });

  it('allows athletes to create their own profile', () => {
    expect(canCreateOwnAthleteProfile(athlete).allowed).toBe(true);
    expect(canCreateOwnAthleteProfile(recruiter).allowed).toBe(false);
  });

  it('allows athletes to edit only their own profile', () => {
    expect(canEditOwnAthleteProfile(athlete, athlete.id).allowed).toBe(true);
    expect(canEditOwnAthleteProfile(athlete, 'other').allowed).toBe(false);
  });

  it('resolves athlete profile access tiers', () => {
    expect(
      resolveAthleteProfileAccess(athlete, {
        athleteUserId: athlete.id,
        hasActiveGuardianLink: false,
        sharesActiveOrgMembership: false,
      }),
    ).toBe('owner');

    expect(
      resolveAthleteProfileAccess(guardian, {
        athleteUserId: athlete.id,
        hasActiveGuardianLink: true,
        sharesActiveOrgMembership: false,
      }),
    ).toBe('restricted');

    expect(
      resolveAthleteProfileAccess(recruiter, {
        athleteUserId: athlete.id,
        hasActiveGuardianLink: false,
        sharesActiveOrgMembership: false,
      }),
    ).toBe('public');

    expect(
      resolveAthleteProfileAccess(coach, {
        athleteUserId: athlete.id,
        hasActiveGuardianLink: false,
        sharesActiveOrgMembership: true,
        viewerOrgRole: OrganizationMemberRole.COACH,
      }),
    ).toBe('org');

    expect(
      resolveAthleteProfileAccess(recruiter, {
        athleteUserId: athlete.id,
        hasActiveGuardianLink: false,
        sharesActiveOrgMembership: false,
      }) === 'none'
        ? 'none'
        : resolveAthleteProfileAccess(
            { id: 'x', roles: [UserRoleType.ATHLETE] },
            {
              athleteUserId: athlete.id,
              hasActiveGuardianLink: false,
              sharesActiveOrgMembership: false,
            },
          ),
    ).toBe('none');
  });

  it('denies unrelated athletes from viewing profiles', () => {
    const otherAthlete = { id: '99', roles: [UserRoleType.ATHLETE] };
    expect(
      canViewAthleteProfile(otherAthlete, {
        athleteUserId: athlete.id,
        hasActiveGuardianLink: false,
        sharesActiveOrgMembership: false,
      }).allowed,
    ).toBe(false);
  });

  it('restricts roster view and manage', () => {
    expect(
      canViewOrganizationRoster(coach, {
        role: OrganizationMemberRole.COACH,
        status: 'ACTIVE',
      }).allowed,
    ).toBe(true);
    expect(
      canViewOrganizationRoster(athlete, {
        role: OrganizationMemberRole.MEMBER,
        status: 'ACTIVE',
      }).allowed,
    ).toBe(false);
    expect(
      canManageOrganizationRoster(coach, {
        role: OrganizationMemberRole.COACH,
        status: 'ACTIVE',
      }).allowed,
    ).toBe(true);
    expect(
      canManageOrganizationRoster(athlete, {
        role: OrganizationMemberRole.MEMBER,
        status: 'ACTIVE',
      }).allowed,
    ).toBe(false);
  });
});
