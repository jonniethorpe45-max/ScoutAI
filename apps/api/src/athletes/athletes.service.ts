import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  canCreateOwnAthleteProfile,
  canEditOwnAthleteProfile,
  canViewAthleteProfile,
  resolveAthleteProfileAccess,
  type AthleteAccessContext,
} from '@scoutai/authorization';
import type { AthleteProfileView } from '@scoutai/contracts';
import type { MembershipStatus } from '@scoutai/database';
import type { UpsertAthleteProfileInput } from '@scoutai/validation';
import type { AuthenticatedUser } from '../common/request-context';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../database/prisma.service';
import { mapAthleteProfileView } from './athlete.mapper';

@Injectable()
export class AthletesService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async getMine(viewer: AuthenticatedUser): Promise<AthleteProfileView> {
    const athlete = await this.prisma.client.athlete.findUnique({
      where: { userId: viewer.id },
    });
    if (!athlete) {
      throw new NotFoundException({
        code: 'ATHLETE_PROFILE_NOT_FOUND',
        message: 'Athlete profile not found',
      });
    }
    return mapAthleteProfileView(athlete, 'owner');
  }

  async upsertMine(
    viewer: AuthenticatedUser,
    input: UpsertAthleteProfileInput,
    requestId?: string,
  ): Promise<AthleteProfileView> {
    const createPolicy = canCreateOwnAthleteProfile(viewer);
    if (!createPolicy.allowed) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: createPolicy.reason ?? 'Forbidden',
      });
    }

    const existing = await this.prisma.client.athlete.findUnique({
      where: { userId: viewer.id },
    });

    if (existing) {
      const editPolicy = canEditOwnAthleteProfile(viewer, existing.userId);
      if (!editPolicy.allowed) {
        throw new ForbiddenException({
          code: 'FORBIDDEN',
          message: editPolicy.reason ?? 'Forbidden',
        });
      }
    }

    const dateOfBirth =
      input.dateOfBirth === undefined
        ? undefined
        : input.dateOfBirth === null
          ? null
          : new Date(input.dateOfBirth);

    const athlete = existing
      ? await this.prisma.client.athlete.update({
          where: { id: existing.id },
          data: {
            displayName: input.displayName,
            sport: input.sport ?? existing.sport,
            position: input.position === undefined ? existing.position : input.position,
            graduationYear:
              input.graduationYear === undefined ? existing.graduationYear : input.graduationYear,
            highSchoolName:
              input.highSchoolName === undefined ? existing.highSchoolName : input.highSchoolName,
            heightInches:
              input.heightInches === undefined ? existing.heightInches : input.heightInches,
            weightLbs: input.weightLbs === undefined ? existing.weightLbs : input.weightLbs,
            bio: input.bio === undefined ? existing.bio : input.bio,
            contactEmail:
              input.contactEmail === undefined ? existing.contactEmail : input.contactEmail,
            contactPhone:
              input.contactPhone === undefined ? existing.contactPhone : input.contactPhone,
            city: input.city === undefined ? existing.city : input.city,
            state: input.state === undefined ? existing.state : input.state,
            dateOfBirth: dateOfBirth === undefined ? existing.dateOfBirth : dateOfBirth,
          },
        })
      : await this.prisma.client.athlete.create({
          data: {
            userId: viewer.id,
            displayName: input.displayName,
            sport: input.sport ?? 'football',
            position: input.position ?? null,
            graduationYear: input.graduationYear ?? null,
            highSchoolName: input.highSchoolName ?? null,
            heightInches: input.heightInches ?? null,
            weightLbs: input.weightLbs ?? null,
            bio: input.bio ?? null,
            contactEmail: input.contactEmail ?? null,
            contactPhone: input.contactPhone ?? null,
            city: input.city ?? null,
            state: input.state ?? null,
            dateOfBirth: dateOfBirth ?? null,
          },
        });

    await this.audit.record({
      actorType: 'user',
      actorId: viewer.id,
      action: existing ? 'athlete.profile.updated' : 'athlete.profile.created',
      targetType: 'athlete',
      targetId: athlete.id,
      requestId,
    });

    return mapAthleteProfileView(athlete, 'owner');
  }

  async getById(viewer: AuthenticatedUser, athleteId: string, requestId?: string): Promise<AthleteProfileView> {
    const athlete = await this.prisma.client.athlete.findUnique({
      where: { id: athleteId },
    });
    if (!athlete) {
      throw new NotFoundException({
        code: 'ATHLETE_PROFILE_NOT_FOUND',
        message: 'Athlete profile not found',
      });
    }

    const context = await this.buildAccessContext(viewer, athlete.userId, athlete.id);
    const policy = canViewAthleteProfile(viewer, context);
    if (!policy.allowed) {
      await this.audit.record({
        actorType: 'user',
        actorId: viewer.id,
        action: 'authz.denied',
        targetType: 'athlete',
        targetId: athlete.id,
        requestId,
        metadata: { reason: policy.reason ?? 'denied' },
      });
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: policy.reason ?? 'Forbidden',
      });
    }

    const access = resolveAthleteProfileAccess(viewer, context);
    if (access === 'none') {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Not entitled to view this athlete profile',
      });
    }

    let rosterStatus: MembershipStatus | null = null;
    let organizationId: string | null = null;
    if (access === 'org' || access === 'restricted' || access === 'owner') {
      if (athlete.userId) {
        const membership = await this.prisma.client.organizationMember.findFirst({
          where: { userId: athlete.userId, status: 'ACTIVE' },
        });
        rosterStatus = membership?.status ?? null;
        organizationId = membership?.organizationId ?? null;
      }
    }

    if (access === 'restricted' || access === 'owner') {
      await this.audit.record({
        actorType: 'user',
        actorId: viewer.id,
        action: 'athlete.restricted.viewed',
        targetType: 'athlete',
        targetId: athlete.id,
        requestId,
        metadata: { access },
      });
    }

    return mapAthleteProfileView(
      { ...athlete, rosterStatus, organizationId },
      access,
    );
  }

  private async buildAccessContext(
    viewer: AuthenticatedUser,
    athleteUserId: string | null,
    athleteId: string,
  ): Promise<AthleteAccessContext> {
    const guardianLink = await this.prisma.client.guardianRelationship.findFirst({
      where: {
        athleteId,
        guardianUserId: viewer.id,
        status: 'ACTIVE',
      },
    });

    let sharesActiveOrgMembership = false;
    let viewerOrgRole: AthleteAccessContext['viewerOrgRole'] = null;

    if (athleteUserId) {
      const athleteMemberships = await this.prisma.client.organizationMember.findMany({
        where: { userId: athleteUserId, status: 'ACTIVE' },
        select: { organizationId: true },
      });
      const orgIds = athleteMemberships.map((m) => m.organizationId);
      if (orgIds.length > 0) {
        const viewerMembership = await this.prisma.client.organizationMember.findFirst({
          where: {
            userId: viewer.id,
            organizationId: { in: orgIds },
            status: 'ACTIVE',
          },
        });
        if (viewerMembership) {
          sharesActiveOrgMembership = true;
          viewerOrgRole = viewerMembership.role;
        }
      }
    }

    return {
      athleteUserId,
      hasActiveGuardianLink: Boolean(guardianLink),
      sharesActiveOrgMembership,
      viewerOrgRole,
    };
  }
}
