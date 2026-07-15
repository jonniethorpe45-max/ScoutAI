import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  canCreateOwnAthleteProfile,
  canEditOwnAthleteProfile,
  canPublishAthleteProfile,
  canViewAthleteOwnerData,
  canViewPublicAthleteProfile,
} from '@scoutai/authorization';
import type { AthleteOwnerView, AthletePublicView, CompletenessResult, OnboardingStatus, PublishResult } from '@scoutai/contracts';
import { OnboardingStage, ProfileStatus } from '@scoutai/domain';
import type {
  AcademicInput,
  BiographyInput,
  CreateAthleteInput,
  RecruitingInput,
  SchoolTeamInput,
  SetPositionsInput,
  SetSportInput,
  UpdateIdentityInput,
  VisibilityInput,
  PhysicalInput,
  AdvanceOnboardingInput,
} from '@scoutai/validation';
import { Prisma } from '@scoutai/database';
import { AuditService } from '../audit/audit.service';
import type { AuthenticatedUser } from '../common/request-context';
import { PrismaService } from '../database/prisma.service';
import { computeCompleteness, mapOwnerView, mapPublicView } from './athlete.mapper';
import {
  generateAthleteSlug,
  isMinorAthlete,
  parseOptionalDate,
} from './athlete.utils';

const athleteInclude = {
  sports: { include: { sport: true } },
  positions: { include: { position: true }, orderBy: { displayOrder: 'asc' as const } },
  physicalProfile: true,
  academicProfile: true,
  recruitingProfile: true,
} satisfies Prisma.AthleteInclude;

type AthleteWithRelations = Prisma.AthleteGetPayload<{ include: typeof athleteInclude }>;

const ONBOARDING_ORDER: string[] = [
  OnboardingStage.ACCOUNT_READY,
  OnboardingStage.IDENTITY,
  OnboardingStage.SPORT,
  OnboardingStage.ACADEMIC,
  OnboardingStage.RECRUITING,
  OnboardingStage.VISIBILITY,
  OnboardingStage.COMPLETE,
];

const MINOR_POLICY_NOTE =
  'LEGAL REVIEW REQUIRED: Minor status is derived from date of birth using a provisional platform age threshold. Counsel must review before production enforcement.';

@Injectable()
export class AthletesService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly auditService: AuditService,
  ) {}

  private assertOwnerEdit(user: AuthenticatedUser, athleteUserId: string | null): void {
    const result = canEditOwnAthleteProfile(user, athleteUserId);
    if (!result.allowed) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: result.reason ?? 'Forbidden',
      });
    }
  }

  private async loadMine(userId: string): Promise<AthleteWithRelations | null> {
    return this.prisma.client.athlete.findUnique({
      where: { userId },
      include: athleteInclude,
    });
  }

  private async requireMine(userId: string): Promise<AthleteWithRelations> {
    const athlete = await this.loadMine(userId);
    if (!athlete) {
      throw new NotFoundException({
        code: 'ATHLETE_NOT_FOUND',
        message: 'Athlete profile not found',
      });
    }
    return athlete;
  }

  private async advanceStageIfNeeded(
    athleteId: string,
    current: string,
    target: string,
  ): Promise<void> {
    const currentIdx = ONBOARDING_ORDER.indexOf(current);
    const targetIdx = ONBOARDING_ORDER.indexOf(target);
    if (targetIdx > currentIdx) {
      await this.prisma.client.athlete.update({
        where: { id: athleteId },
        data: { onboardingStage: target as OnboardingStage },
      });
    }
  }

  async getMine(user: AuthenticatedUser): Promise<AthleteOwnerView> {
    const athlete = await this.requireMine(user.id);
    const ownerCheck = canViewAthleteOwnerData(user, athlete.userId);
    if (!ownerCheck.allowed) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: ownerCheck.reason ?? 'Forbidden',
      });
    }
    return mapOwnerView(athlete);
  }

  async createMine(
    user: AuthenticatedUser,
    input: CreateAthleteInput,
    requestId: string,
  ): Promise<AthleteOwnerView> {
    const authz = canCreateOwnAthleteProfile(user);
    if (!authz.allowed) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: authz.reason ?? 'Forbidden',
      });
    }

    const existing = await this.loadMine(user.id);
    if (existing) {
      throw new ConflictException({
        code: 'ATHLETE_EXISTS',
        message: 'Athlete profile already exists for this user',
      });
    }

    const displayName =
      input.displayName?.trim() ||
      [input.firstName, input.lastName].filter(Boolean).join(' ').trim();

    let slug = generateAthleteSlug(input.firstName, input.lastName, displayName);
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const clash = await this.prisma.client.athlete.findUnique({ where: { slug } });
      if (!clash) {
        break;
      }
      slug = generateAthleteSlug(input.firstName, input.lastName, displayName);
    }

    const athlete = await this.prisma.client.athlete.create({
      data: {
        userId: user.id,
        slug,
        firstName: input.firstName,
        middleName: input.middleName ?? null,
        lastName: input.lastName,
        preferredName: input.preferredName ?? null,
        displayName,
        dateOfBirth: parseOptionalDate(input.dateOfBirth ?? null) ?? null,
        city: input.city ?? null,
        stateRegion: input.stateRegion ?? null,
        countryCode: input.countryCode ?? 'US',
        onboardingStage: OnboardingStage.IDENTITY,
        physicalProfile: { create: {} },
        academicProfile: { create: {} },
        recruitingProfile: { create: {} },
      },
      include: athleteInclude,
    });

    await this.auditService.record({
      actorType: 'user',
      actorId: user.id,
      action: 'athlete.created',
      targetType: 'athlete',
      targetId: athlete.id,
      requestId,
    });

    return mapOwnerView(athlete);
  }

  async updateIdentity(
    user: AuthenticatedUser,
    input: UpdateIdentityInput,
    requestId: string,
  ): Promise<AthleteOwnerView> {
    const athlete = await this.requireMine(user.id);
    this.assertOwnerEdit(user, athlete.userId);

    const updated = await this.prisma.client.athlete.update({
      where: { id: athlete.id },
      data: {
        ...(input.firstName !== undefined ? { firstName: input.firstName } : {}),
        ...(input.middleName !== undefined ? { middleName: input.middleName } : {}),
        ...(input.lastName !== undefined ? { lastName: input.lastName } : {}),
        ...(input.preferredName !== undefined ? { preferredName: input.preferredName } : {}),
        ...(input.displayName !== undefined ? { displayName: input.displayName } : {}),
        ...(input.dateOfBirth !== undefined
          ? { dateOfBirth: parseOptionalDate(input.dateOfBirth) ?? null }
          : {}),
        ...(input.city !== undefined ? { city: input.city } : {}),
        ...(input.stateRegion !== undefined ? { stateRegion: input.stateRegion } : {}),
        ...(input.countryCode !== undefined ? { countryCode: input.countryCode } : {}),
        ...(input.postalCode !== undefined ? { postalCode: input.postalCode } : {}),
        onboardingStage:
          ONBOARDING_ORDER.indexOf(athlete.onboardingStage) <
          ONBOARDING_ORDER.indexOf(OnboardingStage.IDENTITY)
            ? OnboardingStage.IDENTITY
            : athlete.onboardingStage,
      },
      include: athleteInclude,
    });

    await this.auditService.record({
      actorType: 'user',
      actorId: user.id,
      action: 'athlete.identity.updated',
      targetType: 'athlete',
      targetId: athlete.id,
      requestId,
    });

    return mapOwnerView(updated);
  }

  async setSport(
    user: AuthenticatedUser,
    input: SetSportInput,
    requestId: string,
  ): Promise<AthleteOwnerView> {
    const athlete = await this.requireMine(user.id);
    this.assertOwnerEdit(user, athlete.userId);

    const sport = await this.prisma.client.sport.findUnique({
      where: { code: input.sportCode.toUpperCase() },
    });
    if (!sport || sport.status !== 'ACTIVE') {
      throw new NotFoundException({
        code: 'SPORT_NOT_FOUND',
        message: 'Sport not found',
      });
    }

    await this.prisma.client.$transaction(async (tx) => {
      if (input.isPrimary !== false) {
        await tx.athleteSport.updateMany({
          where: { athleteId: athlete.id },
          data: { isPrimary: false },
        });
      }

      await tx.athleteSport.upsert({
        where: {
          athleteId_sportId: { athleteId: athlete.id, sportId: sport.id },
        },
        update: {
          isPrimary: input.isPrimary !== false,
          isActive: true,
          startYear: input.startYear ?? null,
        },
        create: {
          athleteId: athlete.id,
          sportId: sport.id,
          isPrimary: input.isPrimary !== false,
          isActive: true,
          startYear: input.startYear ?? null,
        },
      });

      const currentIdx = ONBOARDING_ORDER.indexOf(athlete.onboardingStage);
      const targetIdx = ONBOARDING_ORDER.indexOf(OnboardingStage.SPORT);
      if (targetIdx > currentIdx) {
        await tx.athlete.update({
          where: { id: athlete.id },
          data: { onboardingStage: OnboardingStage.SPORT },
        });
      }
    });

    await this.auditService.record({
      actorType: 'user',
      actorId: user.id,
      action: 'athlete.sport.updated',
      targetType: 'athlete',
      targetId: athlete.id,
      requestId,
      metadata: { sportCode: sport.code },
    });

    return mapOwnerView(await this.requireMine(user.id));
  }

  async setPositions(
    user: AuthenticatedUser,
    input: SetPositionsInput,
    requestId: string,
  ): Promise<AthleteOwnerView> {
    const athlete = await this.requireMine(user.id);
    this.assertOwnerEdit(user, athlete.userId);

    const sport = await this.prisma.client.sport.findUnique({
      where: { code: input.sportCode.toUpperCase() },
    });
    if (!sport) {
      throw new NotFoundException({
        code: 'SPORT_NOT_FOUND',
        message: 'Sport not found',
      });
    }

    const positionCodes = input.positions.map((p) => p.positionCode.toUpperCase());
    const positions = await this.prisma.client.position.findMany({
      where: { sportId: sport.id, code: { in: positionCodes } },
    });
    if (positions.length !== positionCodes.length) {
      throw new BadRequestException({
        code: 'INVALID_POSITIONS',
        message: 'One or more positions are invalid for this sport',
      });
    }

    const primaryCount = input.positions.filter((p) => p.isPrimary).length;
    if (primaryCount !== 1) {
      throw new BadRequestException({
        code: 'PRIMARY_POSITION_REQUIRED',
        message: 'Exactly one primary position is required',
      });
    }

    await this.prisma.client.$transaction(async (tx) => {
      await tx.athletePosition.deleteMany({
        where: { athleteId: athlete.id, sportId: sport.id },
      });

      for (const [index, item] of input.positions.entries()) {
        const position = positions.find((p) => p.code === item.positionCode.toUpperCase())!;
        await tx.athletePosition.create({
          data: {
            athleteId: athlete.id,
            positionId: position.id,
            sportId: sport.id,
            isPrimary: !!item.isPrimary,
            displayOrder: item.displayOrder ?? index,
          },
        });
      }

      const currentIdx = ONBOARDING_ORDER.indexOf(athlete.onboardingStage);
      const targetIdx = ONBOARDING_ORDER.indexOf(OnboardingStage.SPORT);
      if (targetIdx > currentIdx) {
        await tx.athlete.update({
          where: { id: athlete.id },
          data: { onboardingStage: OnboardingStage.SPORT },
        });
      }
    });

    await this.auditService.record({
      actorType: 'user',
      actorId: user.id,
      action: 'athlete.positions.updated',
      targetType: 'athlete',
      targetId: athlete.id,
      requestId,
    });

    return mapOwnerView(await this.requireMine(user.id));
  }

  async updatePhysical(
    user: AuthenticatedUser,
    input: PhysicalInput,
    requestId: string,
  ): Promise<AthleteOwnerView> {
    const athlete = await this.requireMine(user.id);
    this.assertOwnerEdit(user, athlete.userId);

    await this.prisma.client.athletePhysicalProfile.upsert({
      where: { athleteId: athlete.id },
      update: {
        ...(input.heightCm !== undefined ? { heightCm: input.heightCm } : {}),
        ...(input.weightKg !== undefined ? { weightKg: input.weightKg } : {}),
      },
      create: {
        athleteId: athlete.id,
        heightCm: input.heightCm ?? null,
        weightKg: input.weightKg ?? null,
      },
    });

    await this.auditService.record({
      actorType: 'user',
      actorId: user.id,
      action: 'athlete.physical.updated',
      targetType: 'athlete',
      targetId: athlete.id,
      requestId,
    });

    return mapOwnerView(await this.requireMine(user.id));
  }

  async updateAcademic(
    user: AuthenticatedUser,
    input: AcademicInput,
    requestId: string,
  ): Promise<AthleteOwnerView> {
    const athlete = await this.requireMine(user.id);
    this.assertOwnerEdit(user, athlete.userId);

    await this.prisma.client.athleteAcademicProfile.upsert({
      where: { athleteId: athlete.id },
      update: {
        ...(input.schoolName !== undefined ? { schoolName: input.schoolName } : {}),
        ...(input.graduationYear !== undefined ? { graduationYear: input.graduationYear } : {}),
        ...(input.gpa !== undefined ? { gpa: input.gpa } : {}),
        ...(input.gpaScale !== undefined ? { gpaScale: input.gpaScale } : {}),
        ...(input.intendedMajor !== undefined ? { intendedMajor: input.intendedMajor } : {}),
      },
      create: {
        athleteId: athlete.id,
        schoolName: input.schoolName ?? null,
        graduationYear: input.graduationYear ?? null,
        gpa: input.gpa ?? null,
        gpaScale: input.gpaScale ?? null,
        intendedMajor: input.intendedMajor ?? null,
      },
    });

    await this.advanceStageIfNeeded(athlete.id, athlete.onboardingStage, OnboardingStage.ACADEMIC);

    await this.auditService.record({
      actorType: 'user',
      actorId: user.id,
      action: 'athlete.academic.updated',
      targetType: 'athlete',
      targetId: athlete.id,
      requestId,
    });

    return mapOwnerView(await this.requireMine(user.id));
  }

  async updateRecruiting(
    user: AuthenticatedUser,
    input: RecruitingInput,
    requestId: string,
  ): Promise<AthleteOwnerView> {
    const athlete = await this.requireMine(user.id);
    this.assertOwnerEdit(user, athlete.userId);

    await this.prisma.client.athleteRecruitingProfile.upsert({
      where: { athleteId: athlete.id },
      update: {
        ...(input.recruitingStatus !== undefined
          ? { recruitingStatus: input.recruitingStatus }
          : {}),
        ...(input.commitmentStatus !== undefined
          ? { commitmentStatus: input.commitmentStatus }
          : {}),
        ...(input.committedOrganizationText !== undefined
          ? { committedOrganizationText: input.committedOrganizationText }
          : {}),
        ...(input.recruitingBiography !== undefined
          ? { recruitingBiography: input.recruitingBiography }
          : {}),
        ...(input.preferredRegions !== undefined
          ? { preferredRegions: input.preferredRegions as Prisma.InputJsonValue }
          : {}),
        ...(input.preferredCompetitionLevels !== undefined
          ? {
              preferredCompetitionLevels:
                input.preferredCompetitionLevels as Prisma.InputJsonValue,
            }
          : {}),
        ...(input.contactPolicy !== undefined ? { contactPolicy: input.contactPolicy } : {}),
      },
      create: {
        athleteId: athlete.id,
        recruitingStatus: input.recruitingStatus,
        commitmentStatus: input.commitmentStatus,
        committedOrganizationText: input.committedOrganizationText ?? null,
        recruitingBiography: input.recruitingBiography ?? null,
        preferredRegions: (input.preferredRegions as Prisma.InputJsonValue) ?? undefined,
        preferredCompetitionLevels:
          (input.preferredCompetitionLevels as Prisma.InputJsonValue) ?? undefined,
        contactPolicy: input.contactPolicy ?? 'CLOSED',
      },
    });

    await this.advanceStageIfNeeded(athlete.id, athlete.onboardingStage, OnboardingStage.RECRUITING);

    await this.auditService.record({
      actorType: 'user',
      actorId: user.id,
      action: 'athlete.recruiting.updated',
      targetType: 'athlete',
      targetId: athlete.id,
      requestId,
    });

    return mapOwnerView(await this.requireMine(user.id));
  }

  async updateBiography(
    user: AuthenticatedUser,
    input: BiographyInput,
    requestId: string,
  ): Promise<AthleteOwnerView> {
    const athlete = await this.requireMine(user.id);
    this.assertOwnerEdit(user, athlete.userId);

    const updated = await this.prisma.client.athlete.update({
      where: { id: athlete.id },
      data: { biography: input.biography ?? null },
      include: athleteInclude,
    });

    await this.auditService.record({
      actorType: 'user',
      actorId: user.id,
      action: 'athlete.biography.updated',
      targetType: 'athlete',
      targetId: athlete.id,
      requestId,
    });

    return mapOwnerView(updated);
  }

  async updateSchoolTeam(
    user: AuthenticatedUser,
    input: SchoolTeamInput,
    requestId: string,
  ): Promise<AthleteOwnerView> {
    const athlete = await this.requireMine(user.id);
    this.assertOwnerEdit(user, athlete.userId);

    if (input.organizationId) {
      const org = await this.prisma.client.organization.findUnique({
        where: { id: input.organizationId },
      });
      if (!org) {
        throw new NotFoundException({
          code: 'ORGANIZATION_NOT_FOUND',
          message: 'Organization not found',
        });
      }
    }

    const updated = await this.prisma.client.athlete.update({
      where: { id: athlete.id },
      data: {
        ...(input.schoolNameReported !== undefined
          ? { schoolNameReported: input.schoolNameReported }
          : {}),
        ...(input.teamNameReported !== undefined
          ? { teamNameReported: input.teamNameReported }
          : {}),
        ...(input.organizationId !== undefined ? { organizationId: input.organizationId } : {}),
      },
      include: athleteInclude,
    });

    await this.auditService.record({
      actorType: 'user',
      actorId: user.id,
      action: 'athlete.school_team.updated',
      targetType: 'athlete',
      targetId: athlete.id,
      requestId,
    });

    return mapOwnerView(updated);
  }

  async updateVisibility(
    user: AuthenticatedUser,
    input: VisibilityInput,
    requestId: string,
  ): Promise<AthleteOwnerView> {
    const athlete = await this.requireMine(user.id);
    this.assertOwnerEdit(user, athlete.userId);

    const updated = await this.prisma.client.athlete.update({
      where: { id: athlete.id },
      data: {
        profileVisibility: input.profileVisibility,
        visibilitySetAt: new Date(),
        onboardingStage:
          ONBOARDING_ORDER.indexOf(athlete.onboardingStage) <
          ONBOARDING_ORDER.indexOf(OnboardingStage.VISIBILITY)
            ? OnboardingStage.VISIBILITY
            : athlete.onboardingStage,
      },
      include: athleteInclude,
    });

    await this.auditService.record({
      actorType: 'user',
      actorId: user.id,
      action: 'athlete.visibility.updated',
      targetType: 'athlete',
      targetId: athlete.id,
      requestId,
      metadata: { profileVisibility: input.profileVisibility },
    });

    return mapOwnerView(updated);
  }

  async getOnboarding(user: AuthenticatedUser): Promise<OnboardingStatus> {
    const athlete = await this.requireMine(user.id);
    return {
      stage: athlete.onboardingStage,
      completeness: computeCompleteness(athlete),
      isMinor: isMinorAthlete(athlete.dateOfBirth),
      minorPolicyNote: MINOR_POLICY_NOTE,
    };
  }

  async advanceOnboarding(
    user: AuthenticatedUser,
    input: AdvanceOnboardingInput,
    requestId: string,
  ): Promise<OnboardingStatus> {
    const athlete = await this.requireMine(user.id);
    this.assertOwnerEdit(user, athlete.userId);

    await this.prisma.client.athlete.update({
      where: { id: athlete.id },
      data: { onboardingStage: input.stage },
    });

    await this.auditService.record({
      actorType: 'user',
      actorId: user.id,
      action: 'athlete.onboarding.advanced',
      targetType: 'athlete',
      targetId: athlete.id,
      requestId,
      metadata: { stage: input.stage },
    });

    return this.getOnboarding(user);
  }

  async getCompleteness(user: AuthenticatedUser): Promise<CompletenessResult> {
    const athlete = await this.requireMine(user.id);
    return computeCompleteness(athlete);
  }

  async publish(user: AuthenticatedUser, requestId: string): Promise<PublishResult> {
    const athlete = await this.requireMine(user.id);
    const authz = canPublishAthleteProfile(user, athlete.userId);
    if (!authz.allowed) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: authz.reason ?? 'Forbidden',
      });
    }

    const completeness = computeCompleteness(athlete);
    if (!completeness.readyToPublish) {
      throw new BadRequestException({
        code: 'PROFILE_INCOMPLETE',
        message: 'Athlete profile does not meet publish requirements',
        details: completeness,
      });
    }

    const publishedAt = new Date();
    const updated = await this.prisma.client.athlete.update({
      where: { id: athlete.id },
      data: {
        profileStatus: ProfileStatus.PUBLISHED,
        publishedAt,
        onboardingStage: OnboardingStage.COMPLETE,
      },
      include: athleteInclude,
    });

    await this.auditService.record({
      actorType: 'user',
      actorId: user.id,
      action: 'athlete.published',
      targetType: 'athlete',
      targetId: athlete.id,
      requestId,
    });

    return {
      published: true,
      profileStatus: updated.profileStatus,
      publishedAt: updated.publishedAt?.toISOString() ?? null,
      completeness: computeCompleteness(updated),
    };
  }

  async unpublish(user: AuthenticatedUser, requestId: string): Promise<PublishResult> {
    const athlete = await this.requireMine(user.id);
    this.assertOwnerEdit(user, athlete.userId);

    const updated = await this.prisma.client.athlete.update({
      where: { id: athlete.id },
      data: {
        profileStatus: ProfileStatus.DRAFT,
        publishedAt: null,
      },
      include: athleteInclude,
    });

    await this.auditService.record({
      actorType: 'user',
      actorId: user.id,
      action: 'athlete.unpublished',
      targetType: 'athlete',
      targetId: athlete.id,
      requestId,
    });

    return {
      published: false,
      profileStatus: updated.profileStatus,
      publishedAt: null,
      completeness: computeCompleteness(updated),
    };
  }

  async getPublicBySlug(
    slug: string,
    user: AuthenticatedUser | undefined,
  ): Promise<AthletePublicView> {
    const athlete = await this.prisma.client.athlete.findUnique({
      where: { slug },
      include: athleteInclude,
    });

    if (!athlete) {
      throw new NotFoundException({
        code: 'ATHLETE_NOT_FOUND',
        message: 'Athlete profile not found',
      });
    }

    let hasActiveGuardianLink = false;
    if (user) {
      const link = await this.prisma.client.guardianRelationship.findFirst({
        where: {
          athleteId: athlete.id,
          guardianUserId: user.id,
          status: 'ACTIVE',
        },
      });
      hasActiveGuardianLink = !!link;
    }

    const authz = canViewPublicAthleteProfile(user ?? null, {
      visibility: athlete.profileVisibility,
      profileStatus: athlete.profileStatus,
      athleteUserId: athlete.userId,
      hasActiveGuardianLink,
    });

    if (!authz.allowed) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: authz.reason ?? 'Forbidden',
      });
    }

    return mapPublicView(athlete);
  }
}
