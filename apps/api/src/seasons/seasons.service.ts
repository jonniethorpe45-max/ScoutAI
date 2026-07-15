import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { canManageOwnCompetitionData } from '@scoutai/authorization';
import type { AthleteSeasonDto, SeasonDto } from '@scoutai/contracts';
import { AthleteSeasonStatus, SeasonStatus } from '@scoutai/domain';
import type {
  CreateAthleteSeasonInput,
  CreateSeasonInput,
  UpdateAthleteSeasonInput,
} from '@scoutai/validation';
import { AuditService } from '../audit/audit.service';
import type { AuthenticatedUser } from '../common/request-context';
import { PrismaService } from '../database/prisma.service';

const athleteSeasonInclude = {
  season: { include: { sport: true } },
  sport: true,
} as const;

type AthleteSeasonRow = Awaited<
  ReturnType<SeasonsService['loadAthleteSeason']>
>;

@Injectable()
export class SeasonsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly auditService: AuditService,
  ) {}

  private assertManage(user: AuthenticatedUser, athleteUserId: string | null): void {
    const result = canManageOwnCompetitionData(user, athleteUserId);
    if (!result.allowed) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: result.reason ?? 'Forbidden',
      });
    }
  }

  private async requireAthlete(userId: string) {
    const athlete = await this.prisma.client.athlete.findUnique({
      where: { userId },
    });
    if (!athlete) {
      throw new NotFoundException({
        code: 'ATHLETE_NOT_FOUND',
        message: 'Athlete profile not found',
      });
    }
    return athlete;
  }

  private async loadAthleteSeason(id: string) {
    return this.prisma.client.athleteSeason.findUnique({
      where: { id },
      include: athleteSeasonInclude,
    });
  }

  private mapAthleteSeason(
    row: NonNullable<AthleteSeasonRow>,
  ): AthleteSeasonDto {
    return {
      id: row.id,
      athleteId: row.athleteId,
      seasonId: row.seasonId,
      sportId: row.sportId,
      sportCode: row.season.sport.code,
      seasonName: row.season.name,
      seasonYear: row.season.year,
      seasonStatus: row.season.status,
      selfReportedTeamName: row.selfReportedTeamName,
      jerseyNumber: row.jerseyNumber,
      primaryPositionId: row.primaryPositionId,
      organizationId: row.organizationId,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private mapSeason(row: {
    id: string;
    sportId: string;
    name: string;
    year: number;
    startDate: Date | null;
    endDate: Date | null;
    status: string;
    sport: { code: string };
  }): SeasonDto {
    return {
      id: row.id,
      sportId: row.sportId,
      sportCode: row.sport.code,
      name: row.name,
      year: row.year,
      startDate: row.startDate?.toISOString() ?? null,
      endDate: row.endDate?.toISOString() ?? null,
      status: row.status,
    };
  }

  async listCatalog(sportCode: string): Promise<SeasonDto[]> {
    if (!sportCode?.trim()) {
      throw new BadRequestException({
        code: 'SPORT_CODE_REQUIRED',
        message: 'Query parameter sportCode is required',
      });
    }

    const sport = await this.prisma.client.sport.findUnique({
      where: { code: sportCode.toUpperCase() },
    });
    if (!sport) {
      throw new NotFoundException({
        code: 'SPORT_NOT_FOUND',
        message: 'Sport not found',
      });
    }

    const seasons = await this.prisma.client.season.findMany({
      where: { sportId: sport.id },
      include: { sport: true },
      orderBy: [{ year: 'desc' }, { name: 'asc' }],
    });

    return seasons.map((s) => this.mapSeason(s));
  }

  async listMine(user: AuthenticatedUser): Promise<AthleteSeasonDto[]> {
    const athlete = await this.requireAthlete(user.id);
    this.assertManage(user, athlete.userId);

    const rows = await this.prisma.client.athleteSeason.findMany({
      where: { athleteId: athlete.id },
      include: athleteSeasonInclude,
      orderBy: [{ season: { year: 'desc' } }, { createdAt: 'desc' }],
    });

    return rows.map((row) => this.mapAthleteSeason(row));
  }

  async getMine(user: AuthenticatedUser, id: string): Promise<AthleteSeasonDto> {
    const athlete = await this.requireAthlete(user.id);
    this.assertManage(user, athlete.userId);

    const row = await this.loadAthleteSeason(id);
    if (!row || row.athleteId !== athlete.id) {
      throw new NotFoundException({
        code: 'ATHLETE_SEASON_NOT_FOUND',
        message: 'Athlete season not found',
      });
    }

    return this.mapAthleteSeason(row);
  }

  async createFromCatalog(
    user: AuthenticatedUser,
    input: CreateSeasonInput,
    requestId: string,
  ): Promise<AthleteSeasonDto> {
    const athlete = await this.requireAthlete(user.id);
    this.assertManage(user, athlete.userId);

    const sport = await this.prisma.client.sport.findUnique({
      where: { code: input.sportCode.toUpperCase() },
    });
    if (!sport || sport.status !== 'ACTIVE') {
      throw new NotFoundException({
        code: 'SPORT_NOT_FOUND',
        message: 'Sport not found',
      });
    }

    const season = await this.prisma.client.season.upsert({
      where: {
        sportId_name_year: {
          sportId: sport.id,
          name: input.name,
          year: input.year,
        },
      },
      update: {
        ...(input.startDate !== undefined
          ? { startDate: input.startDate ? new Date(input.startDate) : null }
          : {}),
        ...(input.endDate !== undefined
          ? { endDate: input.endDate ? new Date(input.endDate) : null }
          : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
      },
      create: {
        sportId: sport.id,
        name: input.name,
        year: input.year,
        startDate: input.startDate ? new Date(input.startDate) : null,
        endDate: input.endDate ? new Date(input.endDate) : null,
        status: input.status ?? SeasonStatus.UPCOMING,
      },
      include: { sport: true },
    });

    const existing = await this.prisma.client.athleteSeason.findUnique({
      where: {
        athleteId_seasonId: { athleteId: athlete.id, seasonId: season.id },
      },
    });
    if (existing) {
      throw new ConflictException({
        code: 'ATHLETE_SEASON_EXISTS',
        message: 'Athlete is already linked to this season',
      });
    }

    const row = await this.prisma.client.athleteSeason.create({
      data: {
        athleteId: athlete.id,
        seasonId: season.id,
        sportId: sport.id,
        status: AthleteSeasonStatus.ACTIVE,
      },
      include: athleteSeasonInclude,
    });

    await this.auditService.record({
      actorType: 'user',
      actorId: user.id,
      action: 'athlete.season.created',
      targetType: 'athlete_season',
      targetId: row.id,
      requestId,
      metadata: { seasonId: season.id, via: 'catalog' },
    });

    return this.mapAthleteSeason(row);
  }

  async createAthleteSeason(
    user: AuthenticatedUser,
    input: CreateAthleteSeasonInput,
    requestId: string,
  ): Promise<AthleteSeasonDto> {
    const athlete = await this.requireAthlete(user.id);
    this.assertManage(user, athlete.userId);

    const season = await this.prisma.client.season.findUnique({
      where: { id: input.seasonId },
      include: { sport: true },
    });
    if (!season) {
      throw new NotFoundException({
        code: 'SEASON_NOT_FOUND',
        message: 'Season not found',
      });
    }

    const existing = await this.prisma.client.athleteSeason.findUnique({
      where: {
        athleteId_seasonId: { athleteId: athlete.id, seasonId: season.id },
      },
    });
    if (existing) {
      throw new ConflictException({
        code: 'ATHLETE_SEASON_EXISTS',
        message: 'Athlete is already linked to this season',
      });
    }

    if (input.primaryPositionId) {
      const position = await this.prisma.client.position.findUnique({
        where: { id: input.primaryPositionId },
      });
      if (!position || position.sportId !== season.sportId) {
        throw new NotFoundException({
          code: 'POSITION_NOT_FOUND',
          message: 'Position not found for this sport',
        });
      }
    }

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

    const row = await this.prisma.client.athleteSeason.create({
      data: {
        athleteId: athlete.id,
        seasonId: season.id,
        sportId: season.sportId,
        selfReportedTeamName: input.selfReportedTeamName ?? null,
        jerseyNumber: input.jerseyNumber ?? null,
        primaryPositionId: input.primaryPositionId ?? null,
        organizationId: input.organizationId ?? null,
        status: input.status ?? AthleteSeasonStatus.ACTIVE,
      },
      include: athleteSeasonInclude,
    });

    await this.auditService.record({
      actorType: 'user',
      actorId: user.id,
      action: 'athlete.season.created',
      targetType: 'athlete_season',
      targetId: row.id,
      requestId,
      metadata: { seasonId: season.id, via: 'link' },
    });

    return this.mapAthleteSeason(row);
  }

  async updateMine(
    user: AuthenticatedUser,
    id: string,
    input: UpdateAthleteSeasonInput,
    requestId: string,
  ): Promise<AthleteSeasonDto> {
    const athlete = await this.requireAthlete(user.id);
    this.assertManage(user, athlete.userId);

    const existing = await this.loadAthleteSeason(id);
    if (!existing || existing.athleteId !== athlete.id) {
      throw new NotFoundException({
        code: 'ATHLETE_SEASON_NOT_FOUND',
        message: 'Athlete season not found',
      });
    }

    if (input.primaryPositionId) {
      const position = await this.prisma.client.position.findUnique({
        where: { id: input.primaryPositionId },
      });
      if (!position || position.sportId !== existing.sportId) {
        throw new NotFoundException({
          code: 'POSITION_NOT_FOUND',
          message: 'Position not found for this sport',
        });
      }
    }

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

    const row = await this.prisma.client.athleteSeason.update({
      where: { id },
      data: {
        ...(input.selfReportedTeamName !== undefined
          ? { selfReportedTeamName: input.selfReportedTeamName }
          : {}),
        ...(input.jerseyNumber !== undefined ? { jerseyNumber: input.jerseyNumber } : {}),
        ...(input.primaryPositionId !== undefined
          ? { primaryPositionId: input.primaryPositionId }
          : {}),
        ...(input.organizationId !== undefined
          ? { organizationId: input.organizationId }
          : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
      },
      include: athleteSeasonInclude,
    });

    await this.auditService.record({
      actorType: 'user',
      actorId: user.id,
      action: 'athlete.season.updated',
      targetType: 'athlete_season',
      targetId: row.id,
      requestId,
    });

    return this.mapAthleteSeason(row);
  }
}
