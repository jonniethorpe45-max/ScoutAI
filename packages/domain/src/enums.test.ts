import { describe, expect, it } from 'vitest';
import { OrganizationMemberRole, ProfileFieldTier, UserRoleType, UserStatus } from './enums';

describe('domain enums', () => {
  it('exposes stable user status values', () => {
    expect(UserStatus.ACTIVE).toBe('ACTIVE');
    expect(UserStatus.DISABLED).toBe('DISABLED');
    expect(UserStatus.PENDING).toBe('PENDING');
  });

  it('exposes scoutai admin role', () => {
    expect(UserRoleType.SCOUTAI_ADMIN).toBe('SCOUTAI_ADMIN');
  });

  it('exposes org member roles and profile tiers', () => {
    expect(OrganizationMemberRole.COACH).toBe('COACH');
    expect(ProfileFieldTier.RESTRICTED).toBe('RESTRICTED');
  });
});
