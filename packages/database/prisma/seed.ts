import { createHash, randomBytes } from 'node:crypto';
import {
  PrismaClient,
  UserRoleType,
  OrganizationType,
  MembershipStatus,
  OrganizationMemberRole,
  SportStatus,
  ProfileStatus,
  ProfileVisibility,
  OnboardingStage,
  GuardianRelationshipStatus,
  GuardianInviteStatus,
} from '@prisma/client';
import { Argon2PasswordHasher } from '@scoutai/auth';

const prisma = new PrismaClient();
const hasher = new Argon2PasswordHasher();

const FOOTBALL_POSITIONS: Array<{ code: string; name: string; displayOrder: number }> = [
  { code: 'QB', name: 'Quarterback', displayOrder: 1 },
  { code: 'RB', name: 'Running Back', displayOrder: 2 },
  { code: 'WR', name: 'Wide Receiver', displayOrder: 3 },
  { code: 'TE', name: 'Tight End', displayOrder: 4 },
  { code: 'OT', name: 'Offensive Tackle', displayOrder: 5 },
  { code: 'OG', name: 'Offensive Guard', displayOrder: 6 },
  { code: 'C', name: 'Center', displayOrder: 7 },
  { code: 'DL', name: 'Defensive Lineman', displayOrder: 8 },
  { code: 'EDGE', name: 'Edge Rusher', displayOrder: 9 },
  { code: 'LB', name: 'Linebacker', displayOrder: 10 },
  { code: 'CB', name: 'Cornerback', displayOrder: 11 },
  { code: 'S', name: 'Safety', displayOrder: 12 },
  { code: 'K', name: 'Kicker', displayOrder: 13 },
  { code: 'P', name: 'Punter', displayOrder: 14 },
  { code: 'LS', name: 'Long Snapper', displayOrder: 15 },
  { code: 'ATH', name: 'Athlete', displayOrder: 16 },
];

async function upsertUser(input: {
  email: string;
  password: string;
  roles: UserRoleType[];
}) {
  const normalizedEmail = input.email.trim().toLowerCase();
  const passwordHash = await hasher.hash(input.password);

  const user = await prisma.user.upsert({
    where: { normalizedEmail },
    update: {
      passwordHash,
      status: 'ACTIVE',
    },
    create: {
      email: input.email,
      normalizedEmail,
      passwordHash,
      status: 'ACTIVE',
    },
  });

  for (const role of input.roles) {
    await prisma.userRole.upsert({
      where: { userId_role: { userId: user.id, role } },
      update: {},
      create: { userId: user.id, role },
    });
  }

  return user;
}

async function main() {
  const football = await prisma.sport.upsert({
    where: { code: 'FOOTBALL' },
    update: {
      name: 'Football',
      status: SportStatus.ACTIVE,
    },
    create: {
      code: 'FOOTBALL',
      name: 'Football',
      status: SportStatus.ACTIVE,
    },
  });

  for (const position of FOOTBALL_POSITIONS) {
    await prisma.position.upsert({
      where: {
        sportId_code: { sportId: football.id, code: position.code },
      },
      update: {
        name: position.name,
        displayOrder: position.displayOrder,
      },
      create: {
        sportId: football.id,
        code: position.code,
        name: position.name,
        displayOrder: position.displayOrder,
      },
    });
  }

  const admin = await upsertUser({
    email: 'admin@scoutai.dev',
    password: 'AdminPass1!',
    roles: [UserRoleType.SCOUTAI_ADMIN],
  });

  const athleteUser = await upsertUser({
    email: 'athlete@scoutai.dev',
    password: 'AthletePass1!',
    roles: [UserRoleType.ATHLETE],
  });

  const guardianUser = await upsertUser({
    email: 'guardian@scoutai.dev',
    password: 'GuardianPass1!',
    roles: [UserRoleType.GUARDIAN],
  });

  const coachUser = await upsertUser({
    email: 'coach@scoutai.dev',
    password: 'CoachPass1!',
    roles: [UserRoleType.COACH],
  });

  const orgAdminUser = await upsertUser({
    email: 'orgadmin@scoutai.dev',
    password: 'OrgAdminPass1!',
    roles: [UserRoleType.ORGANIZATION_ADMIN],
  });

  const recruiterUser = await upsertUser({
    email: 'recruiter@scoutai.dev',
    password: 'RecruiterPass1!',
    roles: [UserRoleType.RECRUITER],
  });

  const org = await prisma.organization.upsert({
    where: { slug: 'north-field-demo-hs' },
    update: {
      name: 'North Field Demo High School',
      type: OrganizationType.HIGH_SCHOOL,
      status: MembershipStatus.ACTIVE,
    },
    create: {
      name: 'North Field Demo High School',
      slug: 'north-field-demo-hs',
      type: OrganizationType.HIGH_SCHOOL,
      status: MembershipStatus.ACTIVE,
    },
  });

  const memberships: Array<{
    userId: string;
    role: OrganizationMemberRole;
  }> = [
    { userId: athleteUser.id, role: OrganizationMemberRole.MEMBER },
    { userId: coachUser.id, role: OrganizationMemberRole.COACH },
    { userId: orgAdminUser.id, role: OrganizationMemberRole.ADMIN },
  ];

  for (const membership of memberships) {
    await prisma.organizationMember.upsert({
      where: {
        organizationId_userId: {
          organizationId: org.id,
          userId: membership.userId,
        },
      },
      update: {
        role: membership.role,
        status: MembershipStatus.ACTIVE,
      },
      create: {
        organizationId: org.id,
        userId: membership.userId,
        role: membership.role,
        status: MembershipStatus.ACTIVE,
      },
    });
  }

  const demoSlug = 'demo-athlete-0001';

  const athlete = await prisma.athlete.upsert({
    where: { userId: athleteUser.id },
    update: {
      slug: demoSlug,
      firstName: 'Demo',
      lastName: 'Athlete',
      displayName: 'Demo Athlete',
      profileStatus: ProfileStatus.DRAFT,
      profileVisibility: ProfileVisibility.PRIVATE,
      onboardingStage: OnboardingStage.ACCOUNT_READY,
      organizationId: org.id,
      schoolNameReported: 'North Field Demo High School',
      teamNameReported: 'North Field Titans',
    },
    create: {
      userId: athleteUser.id,
      slug: demoSlug,
      firstName: 'Demo',
      lastName: 'Athlete',
      displayName: 'Demo Athlete',
      dateOfBirth: null,
      profileStatus: ProfileStatus.DRAFT,
      profileVisibility: ProfileVisibility.PRIVATE,
      onboardingStage: OnboardingStage.ACCOUNT_READY,
      organizationId: org.id,
      schoolNameReported: 'North Field Demo High School',
      teamNameReported: 'North Field Titans',
    },
  });

  // Backfill any leftover Stage 3 rows that still have temporary migration slugs
  await prisma.athlete.updateMany({
    where: {
      userId: athleteUser.id,
      NOT: { slug: demoSlug },
    },
    data: { slug: demoSlug },
  });

  const qb = await prisma.position.findUniqueOrThrow({
    where: { sportId_code: { sportId: football.id, code: 'QB' } },
  });

  await prisma.athleteSport.upsert({
    where: {
      athleteId_sportId: { athleteId: athlete.id, sportId: football.id },
    },
    update: { isPrimary: true, isActive: true },
    create: {
      athleteId: athlete.id,
      sportId: football.id,
      isPrimary: true,
      isActive: true,
      startYear: 2024,
    },
  });

  await prisma.athletePosition.upsert({
    where: {
      athleteId_positionId: { athleteId: athlete.id, positionId: qb.id },
    },
    update: { isPrimary: true, sportId: football.id, displayOrder: 0 },
    create: {
      athleteId: athlete.id,
      positionId: qb.id,
      sportId: football.id,
      isPrimary: true,
      displayOrder: 0,
    },
  });

  await prisma.athleteAcademicProfile.upsert({
    where: { athleteId: athlete.id },
    update: {
      schoolName: 'North Field Demo High School',
      graduationYear: 2027,
    },
    create: {
      athleteId: athlete.id,
      schoolName: 'North Field Demo High School',
      graduationYear: 2027,
    },
  });

  await prisma.athletePhysicalProfile.upsert({
    where: { athleteId: athlete.id },
    update: {},
    create: { athleteId: athlete.id },
  });

  await prisma.athleteRecruitingProfile.upsert({
    where: { athleteId: athlete.id },
    update: { contactPolicy: 'CLOSED' },
    create: {
      athleteId: athlete.id,
      contactPolicy: 'CLOSED',
    },
  });

  await prisma.guardianRelationship.upsert({
    where: {
      guardianUserId_athleteId: {
        guardianUserId: guardianUser.id,
        athleteId: athlete.id,
      },
    },
    update: {
      relationshipType: 'PARENT',
      status: GuardianRelationshipStatus.ACTIVE,
      inviteStatus: GuardianInviteStatus.ACCEPTED,
      invitedByUserId: athleteUser.id,
      invitedAt: new Date(),
      acceptedAt: new Date(),
      consentGrantedAt: new Date(),
    },
    create: {
      guardianUserId: guardianUser.id,
      athleteId: athlete.id,
      relationshipType: 'PARENT',
      status: GuardianRelationshipStatus.ACTIVE,
      inviteStatus: GuardianInviteStatus.ACCEPTED,
      invitedByUserId: athleteUser.id,
      invitedAt: new Date(),
      acceptedAt: new Date(),
      consentGrantedAt: new Date(),
    },
  });

  await prisma.recruiter.upsert({
    where: { userId: recruiterUser.id },
    update: {
      organizationId: org.id,
      verificationStatus: 'UNVERIFIED',
    },
    create: {
      userId: recruiterUser.id,
      organizationId: org.id,
      verificationStatus: 'UNVERIFIED',
    },
  });

  // Stage 5: football statistic definitions + performance tests + demo season
  const { FOOTBALL_STAT_DEFINITIONS, FOOTBALL_PERFORMANCE_TESTS } = await import(
    './stage5-catalog'
  );

  for (const def of FOOTBALL_STAT_DEFINITIONS) {
    await prisma.statisticDefinition.upsert({
      where: { sportId_code: { sportId: football.id, code: def.code } },
      update: {
        name: def.name,
        shortName: def.shortName,
        description: def.description ?? null,
        dataType: def.dataType,
        unit: def.unit ?? null,
        aggregationType: def.aggregationType,
        category: def.category,
        higherIsBetter: def.higherIsBetter ?? null,
        active: true,
        displayOrder: def.displayOrder,
      },
      create: {
        sportId: football.id,
        code: def.code,
        name: def.name,
        shortName: def.shortName,
        description: def.description ?? null,
        dataType: def.dataType,
        unit: def.unit ?? null,
        aggregationType: def.aggregationType,
        category: def.category,
        higherIsBetter: def.higherIsBetter ?? null,
        active: true,
        displayOrder: def.displayOrder,
      },
    });
  }

  for (const test of FOOTBALL_PERFORMANCE_TESTS) {
    await prisma.performanceTestDefinition.upsert({
      where: { code: test.code },
      update: {
        sportId: football.id,
        name: test.name,
        description: test.description ?? null,
        measurementType: test.measurementType,
        unit: test.unit,
        lowerIsBetter: test.lowerIsBetter,
        active: true,
        displayOrder: test.displayOrder,
      },
      create: {
        sportId: football.id,
        code: test.code,
        name: test.name,
        description: test.description ?? null,
        measurementType: test.measurementType,
        unit: test.unit,
        lowerIsBetter: test.lowerIsBetter,
        active: true,
        displayOrder: test.displayOrder,
      },
    });
  }

  const season = await prisma.season.upsert({
    where: {
      sportId_name_year: {
        sportId: football.id,
        name: '2026 Fall',
        year: 2026,
      },
    },
    update: {
      status: 'ACTIVE',
      startDate: new Date('2026-08-01T00:00:00.000Z'),
      endDate: new Date('2026-12-15T00:00:00.000Z'),
    },
    create: {
      sportId: football.id,
      name: '2026 Fall',
      year: 2026,
      status: 'ACTIVE',
      startDate: new Date('2026-08-01T00:00:00.000Z'),
      endDate: new Date('2026-12-15T00:00:00.000Z'),
    },
  });

  await prisma.athleteSeason.upsert({
    where: {
      athleteId_seasonId: {
        athleteId: athlete.id,
        seasonId: season.id,
      },
    },
    update: {
      selfReportedTeamName: 'North Field Demo HS',
      jerseyNumber: '7',
      status: 'ACTIVE',
    },
    create: {
      athleteId: athlete.id,
      seasonId: season.id,
      sportId: football.id,
      organizationId: org.id,
      selfReportedTeamName: 'North Field Demo HS',
      jerseyNumber: '7',
      status: 'ACTIVE',
    },
  });

  await prisma.auditEvent.create({
    data: {
      actorType: 'system',
      actorId: null,
      action: 'seed.completed',
      targetType: 'database',
      targetId: null,
      requestId: `seed-${randomBytes(4).toString('hex')}`,
      metadata: {
        adminId: admin.id,
        athleteId: athleteUser.id,
        guardianId: guardianUser.id,
        coachId: coachUser.id,
        orgAdminId: orgAdminUser.id,
        recruiterId: recruiterUser.id,
        organizationId: org.id,
        sportId: football.id,
        athleteProfileId: athlete.id,
        seasonId: season.id,
        note: 'Synthetic development seed — not real persons.',
      },
    },
  });

  createHash('sha256').update('scoutai-seed').digest('hex');

  console.log('Seed complete:');
  console.log('  admin@scoutai.dev / AdminPass1! (SCOUTAI_ADMIN)');
  console.log('  athlete@scoutai.dev / AthletePass1! (ATHLETE)');
  console.log('  guardian@scoutai.dev / GuardianPass1! (GUARDIAN)');
  console.log('  coach@scoutai.dev / CoachPass1! (COACH)');
  console.log('  orgadmin@scoutai.dev / OrgAdminPass1! (ORGANIZATION_ADMIN)');
  console.log('  recruiter@scoutai.dev / RecruiterPass1! (RECRUITER)');
  console.log(`  demo athlete slug: ${demoSlug}`);
  console.log(`  demo season: ${season.name} (${season.year})`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
