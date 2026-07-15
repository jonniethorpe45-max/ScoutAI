import { describe, expect, it } from 'vitest';
import { ProfileStatus, ProfileVisibility, UserRoleType } from '@scoutai/domain';
import {
  assertAuthenticated,
  canCreateOwnAthleteProfile,
  canEditOwnAthleteProfile,
  canManageGuardianLink,
  canPublishAthleteProfile,
  canViewAdminSystemInfo,
  canViewAthleteOwnerData,
  canViewPublicAthleteProfile,
  hasRole,
} from './policies';

describe('authorization policies', () => {
  const admin = { id: '1', roles: [UserRoleType.SCOUTAI_ADMIN] };
  const athlete = { id: '2', roles: [UserRoleType.ATHLETE] };
  const otherAthlete = { id: '3', roles: [UserRoleType.ATHLETE] };
  const guardian = { id: '4', roles: [UserRoleType.GUARDIAN] };
  const recruiter = { id: '5', roles: [UserRoleType.RECRUITER] };
  const coach = { id: '6', roles: [UserRoleType.COACH] };

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
    expect(canViewAdminSystemInfo(null).allowed).toBe(false);
  });

  describe('canCreateOwnAthleteProfile', () => {
    it('allows athletes and admins', () => {
      expect(canCreateOwnAthleteProfile(athlete).allowed).toBe(true);
      expect(canCreateOwnAthleteProfile(admin).allowed).toBe(true);
    });

    it('denies unauthenticated and non-athlete roles', () => {
      expect(canCreateOwnAthleteProfile(null).allowed).toBe(false);
      expect(canCreateOwnAthleteProfile(guardian).allowed).toBe(false);
      expect(canCreateOwnAthleteProfile(recruiter).allowed).toBe(false);
      expect(canCreateOwnAthleteProfile(coach).allowed).toBe(false);
    });
  });

  describe('canEditOwnAthleteProfile', () => {
    it('allows owner and admin', () => {
      expect(canEditOwnAthleteProfile(athlete, athlete.id).allowed).toBe(true);
      expect(canEditOwnAthleteProfile(admin, athlete.id).allowed).toBe(true);
    });

    it('denies other users and missing ownership', () => {
      expect(canEditOwnAthleteProfile(otherAthlete, athlete.id).allowed).toBe(false);
      expect(canEditOwnAthleteProfile(guardian, athlete.id).allowed).toBe(false);
      expect(canEditOwnAthleteProfile(athlete, null).allowed).toBe(false);
      expect(canEditOwnAthleteProfile(null, athlete.id).allowed).toBe(false);
    });
  });

  describe('canViewAthleteOwnerData', () => {
    it('allows owner, admin, and linked guardian', () => {
      expect(canViewAthleteOwnerData(athlete, athlete.id).allowed).toBe(true);
      expect(canViewAthleteOwnerData(admin, athlete.id).allowed).toBe(true);
      expect(
        canViewAthleteOwnerData(guardian, athlete.id, { hasActiveGuardianLink: true }).allowed,
      ).toBe(true);
    });

    it('denies unlinked guardian and strangers', () => {
      expect(
        canViewAthleteOwnerData(guardian, athlete.id, { hasActiveGuardianLink: false }).allowed,
      ).toBe(false);
      expect(canViewAthleteOwnerData(recruiter, athlete.id).allowed).toBe(false);
      expect(canViewAthleteOwnerData(null, athlete.id).allowed).toBe(false);
    });
  });

  describe('canViewPublicAthleteProfile', () => {
    const publishedPublic = {
      visibility: ProfileVisibility.PUBLIC,
      profileStatus: ProfileStatus.PUBLISHED,
      athleteUserId: athlete.id,
      hasActiveGuardianLink: false,
    };

    it('allows anyone for published public profiles', () => {
      expect(canViewPublicAthleteProfile(null, publishedPublic).allowed).toBe(true);
      expect(canViewPublicAthleteProfile(recruiter, publishedPublic).allowed).toBe(true);
    });

    it('allows owner and linked guardian even when unpublished', () => {
      expect(
        canViewPublicAthleteProfile(athlete, {
          ...publishedPublic,
          profileStatus: ProfileStatus.DRAFT,
          visibility: ProfileVisibility.PRIVATE,
        }).allowed,
      ).toBe(true);

      expect(
        canViewPublicAthleteProfile(guardian, {
          ...publishedPublic,
          profileStatus: ProfileStatus.DRAFT,
          visibility: ProfileVisibility.PRIVATE,
          hasActiveGuardianLink: true,
        }).allowed,
      ).toBe(true);
    });

    it('denies anonymous access to private or unpublished profiles', () => {
      expect(
        canViewPublicAthleteProfile(null, {
          ...publishedPublic,
          visibility: ProfileVisibility.PRIVATE,
        }).allowed,
      ).toBe(false);

      expect(
        canViewPublicAthleteProfile(null, {
          ...publishedPublic,
          profileStatus: ProfileStatus.DRAFT,
        }).allowed,
      ).toBe(false);
    });

    it('requires auth for CONNECTIONS visibility', () => {
      expect(
        canViewPublicAthleteProfile(null, {
          ...publishedPublic,
          visibility: ProfileVisibility.CONNECTIONS,
        }).allowed,
      ).toBe(false);

      expect(
        canViewPublicAthleteProfile(recruiter, {
          ...publishedPublic,
          visibility: ProfileVisibility.CONNECTIONS,
        }).allowed,
      ).toBe(true);
    });
  });

  describe('canManageGuardianLink', () => {
    it('allows athlete owner and guardian party', () => {
      expect(
        canManageGuardianLink(athlete, {
          athleteUserId: athlete.id,
          isInviteAction: true,
        }).allowed,
      ).toBe(true);

      expect(
        canManageGuardianLink(guardian, {
          athleteUserId: athlete.id,
          guardianUserId: guardian.id,
        }).allowed,
      ).toBe(true);
    });

    it('denies unrelated users', () => {
      expect(
        canManageGuardianLink(recruiter, {
          athleteUserId: athlete.id,
          guardianUserId: guardian.id,
        }).allowed,
      ).toBe(false);

      expect(
        canManageGuardianLink(null, {
          athleteUserId: athlete.id,
        }).allowed,
      ).toBe(false);
    });
  });

  describe('canPublishAthleteProfile', () => {
    it('allows owner and denies others', () => {
      expect(canPublishAthleteProfile(athlete, athlete.id).allowed).toBe(true);
      expect(canPublishAthleteProfile(otherAthlete, athlete.id).allowed).toBe(false);
      expect(canPublishAthleteProfile(null, athlete.id).allowed).toBe(false);
    });
  });
});
