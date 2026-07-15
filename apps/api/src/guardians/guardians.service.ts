import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { canManageGuardianLink } from '@scoutai/authorization';
import type { GuardianLinkResponse } from '@scoutai/contracts';
import { UserRoleType } from '@scoutai/domain';
import type { GuardianInviteInput } from '@scoutai/validation';
import type { AuthenticatedUser } from '../common/request-context';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../database/prisma.service';

function mapLink(row: {
  id: string;
  guardianUserId: string;
  athleteId: string;
  relationshipType: string;
  status: string;
  invitedByUserId: string | null;
  consentGrantedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): GuardianLinkResponse {
  return {
    id: row.id,
    guardianUserId: row.guardianUserId,
    athleteId: row.athleteId,
    relationshipType: row.relationshipType,
    status: row.status as GuardianLinkResponse['status'],
    invitedByUserId: row.invitedByUserId,
    consentGrantedAt: row.consentGrantedAt ? row.consentGrantedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

@Injectable()
export class GuardiansService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async invite(
    viewer: AuthenticatedUser,
    input: GuardianInviteInput,
    requestId?: string,
  ): Promise<GuardianLinkResponse> {
    const athlete = await this.prisma.client.athlete.findUnique({
      where: { userId: viewer.id },
    });
    if (!athlete) {
      throw new NotFoundException({
        code: 'ATHLETE_PROFILE_NOT_FOUND',
        message: 'Create an athlete profile before inviting a guardian',
      });
    }

    const normalizedEmail = input.guardianEmail.trim().toLowerCase();
    const guardianUser = await this.prisma.client.user.findUnique({
      where: { normalizedEmail },
      include: { roles: true },
    });
    if (!guardianUser) {
      throw new NotFoundException({
        code: 'GUARDIAN_USER_NOT_FOUND',
        message: 'No account found for that guardian email',
      });
    }
    if (!guardianUser.roles.some((role) => role.role === UserRoleType.GUARDIAN)) {
      throw new BadRequestException({
        code: 'GUARDIAN_ROLE_REQUIRED',
        message: 'Target user must have the GUARDIAN role',
      });
    }

    const policy = canManageGuardianLink(viewer, {
      athleteUserId: athlete.userId,
      guardianUserId: guardianUser.id,
    });
    if (!policy.allowed) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: policy.reason ?? 'Forbidden',
      });
    }

    const existing = await this.prisma.client.guardianRelationship.findUnique({
      where: {
        guardianUserId_athleteId: {
          guardianUserId: guardianUser.id,
          athleteId: athlete.id,
        },
      },
    });

    if (existing && existing.status === 'ACTIVE') {
      throw new BadRequestException({
        code: 'GUARDIAN_LINK_ACTIVE',
        message: 'Guardian link is already active',
      });
    }

    const link = existing
      ? await this.prisma.client.guardianRelationship.update({
          where: { id: existing.id },
          data: {
            status: 'PENDING',
            relationshipType: input.relationshipType,
            invitedByUserId: viewer.id,
            consentGrantedAt: null,
            consentRevokedAt: null,
          },
        })
      : await this.prisma.client.guardianRelationship.create({
          data: {
            guardianUserId: guardianUser.id,
            athleteId: athlete.id,
            relationshipType: input.relationshipType,
            status: 'PENDING',
            invitedByUserId: viewer.id,
          },
        });

    await this.audit.record({
      actorType: 'user',
      actorId: viewer.id,
      action: 'guardian.invite.created',
      targetType: 'guardian_relationship',
      targetId: link.id,
      requestId,
    });

    return mapLink(link);
  }

  async accept(viewer: AuthenticatedUser, linkId: string, requestId?: string): Promise<GuardianLinkResponse> {
    const link = await this.prisma.client.guardianRelationship.findUnique({
      where: { id: linkId },
      include: { athlete: true },
    });
    if (!link) {
      throw new NotFoundException({
        code: 'GUARDIAN_LINK_NOT_FOUND',
        message: 'Guardian link not found',
      });
    }
    if (link.status !== 'PENDING') {
      throw new BadRequestException({
        code: 'GUARDIAN_LINK_NOT_PENDING',
        message: 'Only pending guardian links can be accepted',
      });
    }

    const policy = canManageGuardianLink(viewer, {
      athleteUserId: link.athlete.userId,
      guardianUserId: link.guardianUserId,
    });
    if (!policy.allowed) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: policy.reason ?? 'Forbidden',
      });
    }

    // Acceptor must be the guardian (invitee) or admin — athlete already invited.
    const isGuardian = viewer.id === link.guardianUserId;
    const isAdmin = viewer.roles.includes(UserRoleType.SCOUTAI_ADMIN);
    if (!isGuardian && !isAdmin) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Only the invited guardian may accept this link',
      });
    }

    const updated = await this.prisma.client.guardianRelationship.update({
      where: { id: link.id },
      data: {
        status: 'ACTIVE',
        consentGrantedAt: new Date(),
        consentRevokedAt: null,
      },
    });

    await this.audit.record({
      actorType: 'user',
      actorId: viewer.id,
      action: 'guardian.invite.accepted',
      targetType: 'guardian_relationship',
      targetId: updated.id,
      requestId,
    });

    return mapLink(updated);
  }

  async revoke(viewer: AuthenticatedUser, linkId: string, requestId?: string): Promise<GuardianLinkResponse> {
    const link = await this.prisma.client.guardianRelationship.findUnique({
      where: { id: linkId },
      include: { athlete: true },
    });
    if (!link) {
      throw new NotFoundException({
        code: 'GUARDIAN_LINK_NOT_FOUND',
        message: 'Guardian link not found',
      });
    }

    const policy = canManageGuardianLink(viewer, {
      athleteUserId: link.athlete.userId,
      guardianUserId: link.guardianUserId,
    });
    if (!policy.allowed) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: policy.reason ?? 'Forbidden',
      });
    }

    const updated = await this.prisma.client.guardianRelationship.update({
      where: { id: link.id },
      data: {
        status: 'REVOKED',
        consentRevokedAt: new Date(),
      },
    });

    await this.audit.record({
      actorType: 'user',
      actorId: viewer.id,
      action: 'guardian.link.revoked',
      targetType: 'guardian_relationship',
      targetId: updated.id,
      requestId,
    });

    return mapLink(updated);
  }

  async listMine(viewer: AuthenticatedUser): Promise<GuardianLinkResponse[]> {
    const asGuardian = await this.prisma.client.guardianRelationship.findMany({
      where: { guardianUserId: viewer.id },
      orderBy: { createdAt: 'desc' },
    });

    const athlete = await this.prisma.client.athlete.findUnique({
      where: { userId: viewer.id },
    });
    const asAthlete = athlete
      ? await this.prisma.client.guardianRelationship.findMany({
          where: { athleteId: athlete.id },
          orderBy: { createdAt: 'desc' },
        })
      : [];

    const byId = new Map<string, (typeof asGuardian)[number]>();
    for (const row of [...asGuardian, ...asAthlete]) {
      byId.set(row.id, row);
    }
    return [...byId.values()].map(mapLink);
  }

  async listLinkedAthletes(viewer: AuthenticatedUser) {
    const links = await this.prisma.client.guardianRelationship.findMany({
      where: { guardianUserId: viewer.id, status: 'ACTIVE' },
      include: { athlete: true },
      orderBy: { createdAt: 'desc' },
    });

    return links.map((link) => ({
      link: mapLink(link),
      athlete: {
        id: link.athlete.id,
        displayName: link.athlete.displayName,
        sport: link.athlete.sport,
        position: link.athlete.position,
        graduationYear: link.athlete.graduationYear,
        contactEmail: link.athlete.contactEmail,
        contactPhone: link.athlete.contactPhone,
      },
    }));
  }
}
