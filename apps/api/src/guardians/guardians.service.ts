import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { canManageGuardianLink } from '@scoutai/authorization';
import {
  GuardianInviteStatus,
  GuardianRelationshipStatus,
} from '@scoutai/database';
import type { GuardianInviteInput } from '@scoutai/validation';
import { AuditService } from '../audit/audit.service';
import type { AuthenticatedUser } from '../common/request-context';
import { PrismaService } from '../database/prisma.service';
import { normalizeEmail } from '../auth/auth.utils';

export interface GuardianInviteView {
  id: string;
  athleteId: string;
  guardianUserId: string;
  relationshipType: string;
  status: string;
  inviteStatus: string;
  invitedAt: string | null;
}

export interface GuardianAcceptView {
  id: string;
  status: string;
  inviteStatus: string;
  acceptedAt: string | null;
}

export interface GuardianRevokeView {
  id: string;
  status: string;
  inviteStatus: string;
  revokedAt: string | null;
}

export interface GuardianLinkView {
  id: string;
  athleteId: string;
  guardianUserId: string;
  relationshipType: string;
  status: string;
  inviteStatus: string;
  invitedAt: string | null;
  acceptedAt: string | null;
  revokedAt: string | null;
  athlete: {
    id: string;
    slug: string;
    displayName: string;
  };
  guardianEmail?: string;
}

export interface GuardianLinksResponse {
  asGuardian: GuardianLinkView[];
  asAthleteOwner: GuardianLinkView[];
}

@Injectable()
export class GuardiansService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly auditService: AuditService,
  ) {}

  async invite(
    user: AuthenticatedUser,
    input: GuardianInviteInput,
    requestId: string,
  ): Promise<GuardianInviteView> {
    const athlete = input.athleteId
      ? await this.prisma.client.athlete.findUnique({ where: { id: input.athleteId } })
      : await this.prisma.client.athlete.findUnique({ where: { userId: user.id } });

    if (!athlete) {
      throw new NotFoundException({
        code: 'ATHLETE_NOT_FOUND',
        message: 'Athlete profile not found',
      });
    }

    const authz = canManageGuardianLink(user, {
      athleteUserId: athlete.userId,
      isInviteAction: true,
    });
    if (!authz.allowed) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: authz.reason ?? 'Forbidden',
      });
    }

    const normalizedEmail = normalizeEmail(input.guardianEmail);
    let guardianUser = await this.prisma.client.user.findUnique({
      where: { normalizedEmail },
      include: { roles: true },
    });

    if (!guardianUser) {
      // Create a pending placeholder is out of scope; invitee must already exist.
      throw new NotFoundException({
        code: 'GUARDIAN_USER_NOT_FOUND',
        message: 'Guardian user must already have an account',
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

    const now = new Date();
    const link = existing
      ? await this.prisma.client.guardianRelationship.update({
          where: { id: existing.id },
          data: {
            relationshipType: input.relationshipType,
            status: GuardianRelationshipStatus.PENDING,
            inviteStatus: GuardianInviteStatus.PENDING,
            invitedByUserId: user.id,
            invitedAt: now,
            acceptedAt: null,
            revokedAt: null,
            consentGrantedAt: null,
            consentRevokedAt: null,
          },
        })
      : await this.prisma.client.guardianRelationship.create({
          data: {
            guardianUserId: guardianUser.id,
            athleteId: athlete.id,
            relationshipType: input.relationshipType,
            status: GuardianRelationshipStatus.PENDING,
            inviteStatus: GuardianInviteStatus.PENDING,
            invitedByUserId: user.id,
            invitedAt: now,
          },
        });

    await this.auditService.record({
      actorType: 'user',
      actorId: user.id,
      action: 'guardian.invite.created',
      targetType: 'guardian_relationship',
      targetId: link.id,
      requestId,
      metadata: { athleteId: athlete.id, guardianUserId: guardianUser.id },
    });

    return {
      id: link.id,
      athleteId: link.athleteId,
      guardianUserId: link.guardianUserId,
      relationshipType: link.relationshipType,
      status: link.status,
      inviteStatus: link.inviteStatus,
      invitedAt: link.invitedAt?.toISOString() ?? null,
    };
  }

  async accept(
    user: AuthenticatedUser,
    inviteId: string,
    requestId: string,
  ): Promise<GuardianAcceptView> {
    const link = await this.prisma.client.guardianRelationship.findUnique({
      where: { id: inviteId },
      include: { athlete: true },
    });

    if (!link) {
      throw new NotFoundException({
        code: 'INVITE_NOT_FOUND',
        message: 'Guardian invite not found',
      });
    }

    const authz = canManageGuardianLink(user, {
      athleteUserId: link.athlete.userId,
      guardianUserId: link.guardianUserId,
    });
    if (!authz.allowed || user.id !== link.guardianUserId) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Only the invited guardian can accept this invite',
      });
    }

    const now = new Date();
    const updated = await this.prisma.client.guardianRelationship.update({
      where: { id: link.id },
      data: {
        status: GuardianRelationshipStatus.ACTIVE,
        inviteStatus: GuardianInviteStatus.ACCEPTED,
        acceptedAt: now,
        consentGrantedAt: now,
        revokedAt: null,
        consentRevokedAt: null,
      },
    });

    await this.auditService.record({
      actorType: 'user',
      actorId: user.id,
      action: 'guardian.invite.accepted',
      targetType: 'guardian_relationship',
      targetId: updated.id,
      requestId,
    });

    return {
      id: updated.id,
      status: updated.status,
      inviteStatus: updated.inviteStatus,
      acceptedAt: updated.acceptedAt?.toISOString() ?? null,
    };
  }

  async revoke(
    user: AuthenticatedUser,
    inviteId: string,
    requestId: string,
  ): Promise<GuardianRevokeView> {
    const link = await this.prisma.client.guardianRelationship.findUnique({
      where: { id: inviteId },
      include: { athlete: true },
    });

    if (!link) {
      throw new NotFoundException({
        code: 'INVITE_NOT_FOUND',
        message: 'Guardian invite not found',
      });
    }

    const authz = canManageGuardianLink(user, {
      athleteUserId: link.athlete.userId,
      guardianUserId: link.guardianUserId,
    });
    if (!authz.allowed) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: authz.reason ?? 'Forbidden',
      });
    }

    const now = new Date();
    const updated = await this.prisma.client.guardianRelationship.update({
      where: { id: link.id },
      data: {
        status: GuardianRelationshipStatus.REVOKED,
        inviteStatus: GuardianInviteStatus.REVOKED,
        revokedAt: now,
        consentRevokedAt: now,
      },
    });

    await this.auditService.record({
      actorType: 'user',
      actorId: user.id,
      action: 'guardian.invite.revoked',
      targetType: 'guardian_relationship',
      targetId: updated.id,
      requestId,
    });

    return {
      id: updated.id,
      status: updated.status,
      inviteStatus: updated.inviteStatus,
      revokedAt: updated.revokedAt?.toISOString() ?? null,
    };
  }

  async listLinks(user: AuthenticatedUser): Promise<GuardianLinksResponse> {
    const asGuardian = await this.prisma.client.guardianRelationship.findMany({
      where: { guardianUserId: user.id },
      include: {
        athlete: {
          select: {
            id: true,
            slug: true,
            displayName: true,
            userId: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const ownedAthlete = await this.prisma.client.athlete.findUnique({
      where: { userId: user.id },
    });

    const asAthleteOwner = ownedAthlete
      ? await this.prisma.client.guardianRelationship.findMany({
          where: { athleteId: ownedAthlete.id },
          include: {
            guardian: {
              select: { id: true, email: true },
            },
            athlete: {
              select: {
                id: true,
                slug: true,
                displayName: true,
                userId: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        })
      : [];

    const mapLink = (
      link: (typeof asGuardian)[number] | (typeof asAthleteOwner)[number],
    ): GuardianLinkView => ({
      id: link.id,
      athleteId: link.athleteId,
      guardianUserId: link.guardianUserId,
      relationshipType: link.relationshipType,
      status: link.status,
      inviteStatus: link.inviteStatus,
      invitedAt: link.invitedAt?.toISOString() ?? null,
      acceptedAt: link.acceptedAt?.toISOString() ?? null,
      revokedAt: link.revokedAt?.toISOString() ?? null,
      athlete: {
        id: link.athlete.id,
        slug: link.athlete.slug,
        displayName: link.athlete.displayName,
      },
      // Owner listing may include guardian email; public athlete DTOs never do.
      ...('guardian' in link && link.guardian
        ? { guardianEmail: (link.guardian as { email: string }).email }
        : {}),
    });

    return {
      asGuardian: asGuardian.map(mapLink),
      asAthleteOwner: asAthleteOwner.map(mapLink),
    };
  }
}
