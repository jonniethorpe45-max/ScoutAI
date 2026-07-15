import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { canManageOwnCompetitionData } from '@scoutai/authorization';
import type {
  CreateGameResult,
  GameDetailDto,
  GameListItemDto,
  GameStatisticDto,
} from '@scoutai/contracts';
import {
  DataSourceType,
  GameStatus,
  ParticipationStatus,
} from '@scoutai/domain';
import type {
  CreateGameInput,
  UpdateGameInput,
  UpsertParticipationInput,
} from '@scoutai/validation';
import { AuditService } from '../audit/audit.service';
import type { AuthenticatedUser } from '../common/request-context';
import { PrismaService } from '../database/prisma.service';
import {
  DUPLICATE_WINDOW_MS,
  isLikelyDuplicateGame,
  resolveOpponent,
  resolveResult,
} from '../statistics/aggregation';
import { TeamsService } from '../teams/teams.service';

const VIDEO_PLACEHOLDER = 'Highlight video is not available yet.';

const participationInclude = {
  game: true,
  athleteSeason: true,
  statistics: {
    include: { definition: true },
  },
} as const;

@Injectable()
export class GamesService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly auditService: AuditService,
    @Inject(TeamsService) private readonly teamsService: TeamsService,
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

  private resolveTeamContext(input: {
    homeTeamName: string;
    awayTeamName: string;
    athleteTeamName?: string | null;
    athleteTeamSide?: 'HOME' | 'AWAY' | 'UNKNOWN' | null;
  }) {
    return resolveOpponent(input);
  }

  private mapStatistics(
    stats: Array<{
      numericValue: { toString(): string } | number;
      sourceType: string;
      verificationStatus: string;
      definition: {
        code: string;
        name: string;
        shortName: string;
        category: string;
        unit: string | null;
        aggregationType: string;
      };
    }>,
  ): GameStatisticDto[] {
    return stats.map((stat) => ({
      statisticCode: stat.definition.code,
      name: stat.definition.name,
      shortName: stat.definition.shortName,
      category: stat.definition.category,
      unit: stat.definition.unit,
      numericValue: Number(stat.numericValue),
      sourceType: stat.sourceType,
      verificationStatus: stat.verificationStatus,
      derived: stat.definition.aggregationType === 'DERIVED',
    }));
  }

  private mapListItem(
    game: {
      id: string;
      seasonId: string;
      scheduledStart: Date;
      timezone: string;
      status: string;
      homeTeamName: string;
      awayTeamName: string;
      locationName: string | null;
      homeScore: number | null;
      awayScore: number | null;
    },
    participation: {
      participationStatus: string | null;
      statisticsCount: number;
      athleteTeamName?: string | null;
      athleteTeamSide?: 'HOME' | 'AWAY' | 'UNKNOWN' | null;
    },
  ): GameListItemDto {
    const { opponentName, homeAway } = this.resolveTeamContext({
      homeTeamName: game.homeTeamName,
      awayTeamName: game.awayTeamName,
      athleteTeamName: participation.athleteTeamName,
      athleteTeamSide: participation.athleteTeamSide,
    });

    return {
      id: game.id,
      seasonId: game.seasonId,
      scheduledStart: game.scheduledStart.toISOString(),
      timezone: game.timezone,
      status: game.status,
      homeTeamName: game.homeTeamName,
      awayTeamName: game.awayTeamName,
      opponentName,
      homeAway,
      locationName: game.locationName,
      homeScore: game.homeScore,
      awayScore: game.awayScore,
      result: resolveResult({
        homeScore: game.homeScore,
        awayScore: game.awayScore,
        homeAway,
      }),
      participationStatus: participation.participationStatus,
      hasStatistics: participation.statisticsCount > 0,
    };
  }

  private mapDetail(
    participation: {
      id: string;
      participationStatus: string;
      jerseyNumber: string | null;
      starter: boolean | null;
      athleteSeason: { selfReportedTeamName: string | null } | null;
      statistics: Array<{
        numericValue: { toString(): string } | number;
        sourceType: string;
        verificationStatus: string;
        definition: {
          code: string;
          name: string;
          shortName: string;
          category: string;
          unit: string | null;
          aggregationType: string;
        };
      }>;
      game: {
        id: string;
        seasonId: string;
        scheduledStart: Date;
        timezone: string;
        status: string;
        homeTeamName: string;
        awayTeamName: string;
        locationName: string | null;
        city: string | null;
        stateRegion: string | null;
        countryCode: string | null;
        homeScore: number | null;
        awayScore: number | null;
      };
    },
    options?: {
      athleteTeamSide?: 'HOME' | 'AWAY' | 'UNKNOWN' | null;
      possibleDuplicates?: GameListItemDto[];
    },
  ): GameDetailDto {
    const list = this.mapListItem(participation.game, {
      participationStatus: participation.participationStatus,
      statisticsCount: participation.statistics.length,
      athleteTeamName: participation.athleteSeason?.selfReportedTeamName,
      athleteTeamSide: options?.athleteTeamSide,
    });

    return {
      ...list,
      city: participation.game.city,
      stateRegion: participation.game.stateRegion,
      countryCode: participation.game.countryCode,
      participationId: participation.id,
      jerseyNumber: participation.jerseyNumber,
      starter: participation.starter,
      statistics: this.mapStatistics(participation.statistics),
      possibleDuplicates: options?.possibleDuplicates,
      videoPlaceholder: VIDEO_PLACEHOLDER,
    };
  }

  async listMine(
    user: AuthenticatedUser,
    seasonId?: string,
  ): Promise<GameListItemDto[]> {
    const athlete = await this.requireAthlete(user.id);
    this.assertManage(user, athlete.userId);

    const participations = await this.prisma.client.athleteGameParticipation.findMany({
      where: {
        athleteId: athlete.id,
        ...(seasonId ? { game: { seasonId } } : {}),
      },
      include: {
        game: true,
        athleteSeason: true,
        _count: { select: { statistics: true } },
      },
      orderBy: { game: { scheduledStart: 'desc' } },
    });

    return participations.map((p) =>
      this.mapListItem(p.game, {
        participationStatus: p.participationStatus,
        statisticsCount: p._count.statistics,
        athleteTeamName: p.athleteSeason?.selfReportedTeamName,
      }),
    );
  }

  async getMine(user: AuthenticatedUser, gameId: string): Promise<GameDetailDto> {
    const athlete = await this.requireAthlete(user.id);
    this.assertManage(user, athlete.userId);

    const participation = await this.prisma.client.athleteGameParticipation.findUnique({
      where: {
        athleteId_gameId: { athleteId: athlete.id, gameId },
      },
      include: participationInclude,
    });

    if (!participation) {
      throw new NotFoundException({
        code: 'GAME_NOT_FOUND',
        message: 'Game not found',
      });
    }

    return this.mapDetail(participation);
  }

  async createMine(
    user: AuthenticatedUser,
    input: CreateGameInput,
    requestId: string,
  ): Promise<CreateGameResult> {
    const athlete = await this.requireAthlete(user.id);
    this.assertManage(user, athlete.userId);

    const season = await this.prisma.client.season.findUnique({
      where: { id: input.seasonId },
    });
    if (!season) {
      throw new NotFoundException({
        code: 'SEASON_NOT_FOUND',
        message: 'Season not found',
      });
    }

    let athleteSeason =
      input.athleteSeasonId != null
        ? await this.prisma.client.athleteSeason.findUnique({
            where: { id: input.athleteSeasonId },
          })
        : await this.prisma.client.athleteSeason.findUnique({
            where: {
              athleteId_seasonId: {
                athleteId: athlete.id,
                seasonId: season.id,
              },
            },
          });

    if (input.athleteSeasonId) {
      if (!athleteSeason || athleteSeason.athleteId !== athlete.id) {
        throw new NotFoundException({
          code: 'ATHLETE_SEASON_NOT_FOUND',
          message: 'Athlete season not found',
        });
      }
      if (athleteSeason.seasonId !== season.id) {
        throw new NotFoundException({
          code: 'ATHLETE_SEASON_MISMATCH',
          message: 'Athlete season does not match game season',
        });
      }
    }

    const scheduledStart = new Date(input.scheduledStart);
    const windowStart = new Date(scheduledStart.getTime() - DUPLICATE_WINDOW_MS);
    const windowEnd = new Date(scheduledStart.getTime() + DUPLICATE_WINDOW_MS);

    const candidates = await this.prisma.client.game.findMany({
      where: {
        seasonId: season.id,
        scheduledStart: { gte: windowStart, lte: windowEnd },
      },
    });

    const duplicates = candidates.filter((candidate) =>
      isLikelyDuplicateGame({
        seasonId: season.id,
        homeTeamName: input.homeTeamName,
        awayTeamName: input.awayTeamName,
        scheduledStart,
        candidate: {
          seasonId: candidate.seasonId,
          homeTeamName: candidate.homeTeamName,
          awayTeamName: candidate.awayTeamName,
          scheduledStart: candidate.scheduledStart,
        },
      }),
    );

    const homeTeam = await this.teamsService.findOrCreateByName(
      input.homeTeamName,
      season.sportId,
    );
    const awayTeam = await this.teamsService.findOrCreateByName(
      input.awayTeamName,
      season.sportId,
    );

    // Prefer explicit side; otherwise keep existing season team name for presentation.
    if (
      athleteSeason &&
      input.athleteTeamSide &&
      (input.athleteTeamSide === 'HOME' || input.athleteTeamSide === 'AWAY') &&
      !athleteSeason.selfReportedTeamName
    ) {
      const teamName =
        input.athleteTeamSide === 'HOME' ? input.homeTeamName : input.awayTeamName;
      athleteSeason = await this.prisma.client.athleteSeason.update({
        where: { id: athleteSeason.id },
        data: { selfReportedTeamName: teamName },
      });
    }

    const game = await this.prisma.client.game.create({
      data: {
        sportId: season.sportId,
        seasonId: season.id,
        scheduledStart,
        timezone: input.timezone ?? 'America/Chicago',
        status: input.status ?? GameStatus.SCHEDULED,
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
        homeTeamName: input.homeTeamName,
        awayTeamName: input.awayTeamName,
        locationName: input.locationName ?? null,
        city: input.city ?? null,
        stateRegion: input.stateRegion ?? null,
        countryCode: input.countryCode ?? 'US',
        homeScore: input.homeScore ?? null,
        awayScore: input.awayScore ?? null,
        createdByUserId: user.id,
      },
    });

    const participation = await this.prisma.client.athleteGameParticipation.create({
      data: {
        athleteId: athlete.id,
        gameId: game.id,
        athleteSeasonId: athleteSeason?.id ?? null,
        participationStatus: input.participationStatus ?? ParticipationStatus.UNKNOWN,
        jerseyNumber: input.jerseyNumber ?? null,
        starter: input.starter ?? null,
        sourceType: DataSourceType.SELF_REPORTED,
      },
      include: participationInclude,
    });

    const possibleDuplicates = duplicates.map((dup) =>
      this.mapListItem(dup, {
        participationStatus: null,
        statisticsCount: 0,
        athleteTeamName: athleteSeason?.selfReportedTeamName,
        athleteTeamSide: input.athleteTeamSide,
      }),
    );

    const detail = this.mapDetail(participation, {
      athleteTeamSide: input.athleteTeamSide,
      possibleDuplicates,
    });

    await this.auditService.record({
      actorType: 'user',
      actorId: user.id,
      action: 'athlete.game.created',
      targetType: 'game',
      targetId: game.id,
      requestId,
      metadata: {
        duplicateWarning: possibleDuplicates.length > 0 && !input.forceDuplicate,
        forceDuplicate: !!input.forceDuplicate,
      },
    });

    return {
      game: detail,
      possibleDuplicates,
      duplicateWarning: possibleDuplicates.length > 0 && !input.forceDuplicate,
    };
  }

  async updateMine(
    user: AuthenticatedUser,
    gameId: string,
    input: UpdateGameInput,
    requestId: string,
  ): Promise<GameDetailDto> {
    const athlete = await this.requireAthlete(user.id);
    this.assertManage(user, athlete.userId);

    const participation = await this.prisma.client.athleteGameParticipation.findUnique({
      where: {
        athleteId_gameId: { athleteId: athlete.id, gameId },
      },
      include: { game: true },
    });

    if (!participation) {
      throw new NotFoundException({
        code: 'GAME_NOT_FOUND',
        message: 'Game not found',
      });
    }

    const canEdit =
      participation.game.createdByUserId === user.id ||
      participation.athleteId === athlete.id;
    if (!canEdit) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'You cannot update this game',
      });
    }

    await this.prisma.client.game.update({
      where: { id: gameId },
      data: {
        ...(input.scheduledStart !== undefined
          ? { scheduledStart: new Date(input.scheduledStart) }
          : {}),
        ...(input.timezone !== undefined ? { timezone: input.timezone } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.homeTeamName !== undefined ? { homeTeamName: input.homeTeamName } : {}),
        ...(input.awayTeamName !== undefined ? { awayTeamName: input.awayTeamName } : {}),
        ...(input.locationName !== undefined ? { locationName: input.locationName } : {}),
        ...(input.city !== undefined ? { city: input.city } : {}),
        ...(input.stateRegion !== undefined ? { stateRegion: input.stateRegion } : {}),
        ...(input.countryCode !== undefined ? { countryCode: input.countryCode } : {}),
        ...(input.homeScore !== undefined ? { homeScore: input.homeScore } : {}),
        ...(input.awayScore !== undefined ? { awayScore: input.awayScore } : {}),
      },
    });

    const updated = await this.prisma.client.athleteGameParticipation.findUnique({
      where: {
        athleteId_gameId: { athleteId: athlete.id, gameId },
      },
      include: participationInclude,
    });

    await this.auditService.record({
      actorType: 'user',
      actorId: user.id,
      action: 'athlete.game.updated',
      targetType: 'game',
      targetId: gameId,
      requestId,
    });

    return this.mapDetail(updated!);
  }

  async upsertParticipation(
    user: AuthenticatedUser,
    gameId: string,
    input: UpsertParticipationInput,
    requestId: string,
  ): Promise<GameDetailDto> {
    const athlete = await this.requireAthlete(user.id);
    this.assertManage(user, athlete.userId);

    const game = await this.prisma.client.game.findUnique({
      where: { id: gameId },
    });
    if (!game) {
      throw new NotFoundException({
        code: 'GAME_NOT_FOUND',
        message: 'Game not found',
      });
    }

    let athleteSeasonId = input.athleteSeasonId ?? null;
    if (athleteSeasonId) {
      const athleteSeason = await this.prisma.client.athleteSeason.findUnique({
        where: { id: athleteSeasonId },
      });
      if (!athleteSeason || athleteSeason.athleteId !== athlete.id) {
        throw new NotFoundException({
          code: 'ATHLETE_SEASON_NOT_FOUND',
          message: 'Athlete season not found',
        });
      }
    } else {
      const linked = await this.prisma.client.athleteSeason.findUnique({
        where: {
          athleteId_seasonId: {
            athleteId: athlete.id,
            seasonId: game.seasonId,
          },
        },
      });
      athleteSeasonId = linked?.id ?? null;
    }

    if (
      athleteSeasonId &&
      input.athleteTeamSide &&
      (input.athleteTeamSide === 'HOME' || input.athleteTeamSide === 'AWAY')
    ) {
      const seasonRow = await this.prisma.client.athleteSeason.findUnique({
        where: { id: athleteSeasonId },
      });
      if (seasonRow && !seasonRow.selfReportedTeamName) {
        const teamName =
          input.athleteTeamSide === 'HOME' ? game.homeTeamName : game.awayTeamName;
        await this.prisma.client.athleteSeason.update({
          where: { id: athleteSeasonId },
          data: { selfReportedTeamName: teamName },
        });
      }
    }

    await this.prisma.client.athleteGameParticipation.upsert({
      where: {
        athleteId_gameId: { athleteId: athlete.id, gameId },
      },
      update: {
        participationStatus: input.participationStatus,
        ...(input.jerseyNumber !== undefined ? { jerseyNumber: input.jerseyNumber } : {}),
        ...(input.starter !== undefined ? { starter: input.starter } : {}),
        ...(input.athleteSeasonId !== undefined
          ? { athleteSeasonId: input.athleteSeasonId }
          : athleteSeasonId
            ? { athleteSeasonId }
            : {}),
        sourceType: DataSourceType.SELF_REPORTED,
      },
      create: {
        athleteId: athlete.id,
        gameId,
        athleteSeasonId,
        participationStatus: input.participationStatus,
        jerseyNumber: input.jerseyNumber ?? null,
        starter: input.starter ?? null,
        sourceType: DataSourceType.SELF_REPORTED,
      },
    });

    const participation = await this.prisma.client.athleteGameParticipation.findUnique({
      where: {
        athleteId_gameId: { athleteId: athlete.id, gameId },
      },
      include: participationInclude,
    });

    await this.auditService.record({
      actorType: 'user',
      actorId: user.id,
      action: 'athlete.game.updated',
      targetType: 'game',
      targetId: gameId,
      requestId,
      metadata: { participationUpsert: true },
    });

    return this.mapDetail(participation!, {
      athleteTeamSide: input.athleteTeamSide,
    });
  }
}
