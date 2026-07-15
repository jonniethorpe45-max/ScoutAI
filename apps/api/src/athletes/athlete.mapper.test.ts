import { describe, expect, it } from 'vitest';
import { computeCompleteness } from './athlete.mapper';

function baseAthlete(overrides: Partial<Parameters<typeof computeCompleteness>[0]> = {}) {
  return {
    id: 'a1',
    userId: 'u1',
    slug: 'taylor-scout-abcd',
    firstName: 'Taylor',
    middleName: null,
    lastName: 'Scout',
    preferredName: null,
    displayName: 'Taylor Scout',
    dateOfBirth: null,
    city: null,
    stateRegion: null,
    countryCode: 'US',
    postalCode: null,
    biography: null,
    profileStatus: 'DRAFT',
    profileVisibility: 'PRIVATE',
    onboardingStage: 'IDENTITY',
    publishedAt: null,
    visibilitySetAt: null,
    schoolNameReported: null,
    teamNameReported: null,
    organizationId: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    sports: [],
    positions: [],
    physicalProfile: null,
    academicProfile: null,
    recruitingProfile: null,
    ...overrides,
  };
}

describe('computeCompleteness', () => {
  it('requires display name, sport, position, graduation year, and visibility', () => {
    const incomplete = computeCompleteness(baseAthlete());
    expect(incomplete.readyToPublish).toBe(false);
    expect(incomplete.checks.find((c) => c.key === 'displayName')?.satisfied).toBe(true);
    expect(incomplete.checks.find((c) => c.key === 'primarySport')?.satisfied).toBe(false);
    expect(incomplete.checks.find((c) => c.key === 'visibilityChosen')?.satisfied).toBe(false);
  });

  it('marks ready when required checks are satisfied', () => {
    const complete = computeCompleteness(
      baseAthlete({
        visibilitySetAt: new Date('2026-01-02T00:00:00.000Z'),
        sports: [
          {
            sportId: 's1',
            isPrimary: true,
            isActive: true,
            startYear: 2024,
            sport: { code: 'FOOTBALL', name: 'Football' },
          },
        ],
        positions: [
          {
            positionId: 'p1',
            sportId: 's1',
            isPrimary: true,
            displayOrder: 0,
            position: { code: 'QB', name: 'Quarterback' },
          },
        ],
        academicProfile: {
          schoolName: 'Integration High',
          graduationYear: 2027,
          gpa: null,
          gpaScale: null,
          intendedMajor: null,
          updatedAt: new Date('2026-01-02T00:00:00.000Z'),
        },
        biography: 'Ready athlete',
        physicalProfile: {
          heightCm: 180,
          weightKg: 80,
          updatedAt: new Date('2026-01-02T00:00:00.000Z'),
        },
      }),
    );

    expect(complete.readyToPublish).toBe(true);
    expect(complete.score).toBe(100);
    expect(complete.satisfiedChecks).toBe(complete.totalChecks);
  });

  it('treats missing display name as blocking', () => {
    const result = computeCompleteness(baseAthlete({ displayName: '   ' }));
    expect(result.checks.find((c) => c.key === 'displayName')?.satisfied).toBe(false);
    expect(result.readyToPublish).toBe(false);
  });
});
