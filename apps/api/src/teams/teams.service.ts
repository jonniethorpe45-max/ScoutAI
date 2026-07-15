import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class TeamsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async findOrCreateByName(
    name: string,
    sportId?: string | null,
    organizationId?: string | null,
  ) {
    const trimmed = name.trim();
    const existing = await this.prisma.client.team.findFirst({
      where: {
        name: { equals: trimmed, mode: 'insensitive' },
        ...(sportId ? { sportId } : {}),
        ...(organizationId ? { organizationId } : {}),
      },
    });
    if (existing) {
      return existing;
    }

    return this.prisma.client.team.create({
      data: {
        name: trimmed,
        sportId: sportId ?? null,
        organizationId: organizationId ?? null,
      },
    });
  }
}
