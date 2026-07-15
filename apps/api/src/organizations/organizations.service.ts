import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  canManageOrganizationRoster,
  canViewOrganizationRoster,
} from '@scoutai/authorization';
import type { OrganizationSummary, RosterMember } from '@scoutai/contracts';
import { OrganizationMemberRole } from '@scoutai/domain';
import type { AddRosterMemberInput } from '@scoutai/validation';
import type { AuthenticatedUser } from '../common/request-context';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class OrganizationsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async getOrganization(orgId: string): Promise<OrganizationSummary> {
    const org = await this.prisma.client.organization.findUnique({ where: { id: orgId } });
    if (!org) {
      throw new NotFoundException({
        code: 'ORGANIZATION_NOT_FOUND',
        message: 'Organization not found',
      });
    }
    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      type: org.type,
      status: org.status,
    };
  }

  async listMine(viewer: AuthenticatedUser): Promise<OrganizationSummary[]> {
    const memberships = await this.prisma.client.organizationMember.findMany({
      where: { userId: viewer.id, status: 'ACTIVE' },
      include: { organization: true },
      orderBy: { createdAt: 'asc' },
    });
    return memberships.map((m) => ({
      id: m.organization.id,
      name: m.organization.name,
      slug: m.organization.slug,
      type: m.organization.type,
      status: m.organization.status,
    }));
  }

  async getRoster(viewer: AuthenticatedUser, orgId: string, requestId?: string): Promise<RosterMember[]> {
    await this.getOrganization(orgId);
    const membership = await this.prisma.client.organizationMember.findUnique({
      where: {
        organizationId_userId: { organizationId: orgId, userId: viewer.id },
      },
    });

    const policy = canViewOrganizationRoster(
      viewer,
      membership ? { role: membership.role, status: membership.status } : null,
    );
    if (!policy.allowed) {
      await this.audit.record({
        actorType: 'user',
        actorId: viewer.id,
        action: 'authz.denied',
        targetType: 'organization',
        targetId: orgId,
        requestId,
        metadata: { action: 'roster.view', reason: policy.reason },
      });
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: policy.reason ?? 'Forbidden',
      });
    }

    const members = await this.prisma.client.organizationMember.findMany({
      where: {
        organizationId: orgId,
        status: { in: ['ACTIVE', 'INVITED'] },
      },
      include: {
        user: {
          include: {
            athleteProfile: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return members.map((member) => ({
      id: member.id,
      userId: member.userId,
      email: member.user.email,
      role: member.role,
      status: member.status,
      displayName: member.user.athleteProfile?.displayName ?? null,
      athleteId: member.user.athleteProfile?.id ?? null,
    }));
  }

  async addRosterMember(
    viewer: AuthenticatedUser,
    orgId: string,
    input: AddRosterMemberInput,
    requestId?: string,
  ): Promise<RosterMember> {
    await this.getOrganization(orgId);
    const membership = await this.prisma.client.organizationMember.findUnique({
      where: {
        organizationId_userId: { organizationId: orgId, userId: viewer.id },
      },
    });

    const policy = canManageOrganizationRoster(
      viewer,
      membership ? { role: membership.role, status: membership.status } : null,
    );
    if (!policy.allowed) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: policy.reason ?? 'Forbidden',
      });
    }

    const targetUser = await this.prisma.client.user.findUnique({
      where: { id: input.userId },
      include: { athleteProfile: true },
    });
    if (!targetUser) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    const role = input.role ?? OrganizationMemberRole.MEMBER;
    // Coaches may only add MEMBER roles unless they are org ADMIN membership.
    if (
      membership?.role === OrganizationMemberRole.COACH &&
      role !== OrganizationMemberRole.MEMBER
    ) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Coaches may only add members with MEMBER role',
      });
    }

    const member = await this.prisma.client.organizationMember.upsert({
      where: {
        organizationId_userId: { organizationId: orgId, userId: input.userId },
      },
      update: {
        role,
        status: 'ACTIVE',
      },
      create: {
        organizationId: orgId,
        userId: input.userId,
        role,
        status: 'ACTIVE',
      },
      include: {
        user: { include: { athleteProfile: true } },
      },
    });

    await this.audit.record({
      actorType: 'user',
      actorId: viewer.id,
      action: 'organization.roster.added',
      targetType: 'organization_member',
      targetId: member.id,
      requestId,
      metadata: { organizationId: orgId, userId: input.userId, role },
    });

    return {
      id: member.id,
      userId: member.userId,
      email: member.user.email,
      role: member.role,
      status: member.status,
      displayName: member.user.athleteProfile?.displayName ?? null,
      athleteId: member.user.athleteProfile?.id ?? null,
    };
  }

  async removeRosterMember(
    viewer: AuthenticatedUser,
    orgId: string,
    userId: string,
    requestId?: string,
  ): Promise<{ ok: true }> {
    await this.getOrganization(orgId);
    const membership = await this.prisma.client.organizationMember.findUnique({
      where: {
        organizationId_userId: { organizationId: orgId, userId: viewer.id },
      },
    });

    const policy = canManageOrganizationRoster(
      viewer,
      membership ? { role: membership.role, status: membership.status } : null,
    );
    if (!policy.allowed) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: policy.reason ?? 'Forbidden',
      });
    }

    const target = await this.prisma.client.organizationMember.findUnique({
      where: {
        organizationId_userId: { organizationId: orgId, userId },
      },
    });
    if (!target) {
      throw new NotFoundException({
        code: 'ROSTER_MEMBER_NOT_FOUND',
        message: 'Roster member not found',
      });
    }

    await this.prisma.client.organizationMember.update({
      where: { id: target.id },
      data: { status: 'REMOVED' },
    });

    await this.audit.record({
      actorType: 'user',
      actorId: viewer.id,
      action: 'organization.roster.removed',
      targetType: 'organization_member',
      targetId: target.id,
      requestId,
      metadata: { organizationId: orgId, userId },
    });

    return { ok: true };
  }
}
