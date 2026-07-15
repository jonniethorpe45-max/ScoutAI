import { describe, expect, it } from 'vitest';
import { upsertAthleteProfileSchema, guardianInviteSchema } from './athlete';

describe('athlete validation', () => {
  it('accepts a valid profile payload', () => {
    const parsed = upsertAthleteProfileSchema.parse({
      displayName: 'Jordan Lee',
      sport: 'football',
      position: 'QB',
      graduationYear: 2027,
      contactEmail: 'jordan@example.com',
    });
    expect(parsed.displayName).toBe('Jordan Lee');
    expect(parsed.graduationYear).toBe(2027);
  });

  it('rejects invalid graduation year', () => {
    expect(() =>
      upsertAthleteProfileSchema.parse({
        displayName: 'Jordan',
        graduationYear: 1990,
      }),
    ).toThrow();
  });

  it('accepts guardian invite', () => {
    const parsed = guardianInviteSchema.parse({
      guardianEmail: 'parent@example.com',
      relationshipType: 'parent',
    });
    expect(parsed.guardianEmail).toBe('parent@example.com');
  });
});
