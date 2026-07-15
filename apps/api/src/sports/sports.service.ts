import { Inject, Injectable } from '@nestjs/common';
import type { PositionDto, SportDto } from '@scoutai/contracts';
import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class SportsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async listSports(): Promise<SportDto[]> {
    const sports = await this.prisma.client.sport.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { name: 'asc' },
    });

    return sports.map((sport) => ({
      id: sport.id,
      code: sport.code,
      name: sport.name,
      status: sport.status,
    }));
  }

  async listPositionsBySportCode(code: string): Promise<PositionDto[]> {
    const sport = await this.prisma.client.sport.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!sport) {
      throw new NotFoundException({
        code: 'SPORT_NOT_FOUND',
        message: 'Sport not found',
      });
    }

    const positions = await this.prisma.client.position.findMany({
      where: { sportId: sport.id },
      orderBy: { displayOrder: 'asc' },
    });

    return positions.map((position) => ({
      id: position.id,
      sportId: position.sportId,
      code: position.code,
      name: position.name,
      displayOrder: position.displayOrder,
    }));
  }
}
