import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  canManageOwnCompetitionData,
  canSetVerificationStatus,
} from '@scoutai/authorization';
import type {
  GameByGameStatRowDto,
  GameStatisticDto,
  SeasonAggregateDto,
  StatisticDefinitionDto,
} from '@scoutai/contracts';
import {
  DataSourceType,
  StatisticAggregationType,
  VerificationStatus,
} from '@scoutai/domain';
import { Prisma } from '@scoutai/database';
import type { UpsertGameStatisticsInput } from '@scoutai/validation';
import { AuditService } from '../audit/audit.service';
import type { AuthenticatedUser } from '../common/request-context';
import { PrismaService } from '../database/prisma.service';
import {
  aggregateSeasonTotals,
  computeDerivedMetric,
  resolveOpponent,
  resolveResult,
} from './aggregation';

@Injectable()
export class StatisticsService {
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

  private mapDefinition(def: {
    id: string;
    sportId: string;
    code: string;
    name: string;
    shortName: string;
    description: string | null;
    dataType: string;
    unit: string | null;
    aggregationType: string;
    category: string;
    higherIsBetter: boolean | null;
    active: boolean;
    displayOrder: number;
  }): StatisticDefinitionDto {
    return {
      id: def.id,
      sportId: def.sportId,
      code: def.code,
      name: def.name,
      shortName: def.shortName,
      description: def.description,
      dataType: def.dataType,
      unit: def.unit,
      aggregationType: def.aggregationType,
      category: def.category,
      higherIsBetter: def.higherIsBetter,
      active: def.active,
      displayOrder: def.displayOrder,
      derived: def.aggregationType === StatisticAggregationType.DERIVED,
    };
  }

  private mapStatDto(input: {
    code: string;
    name: string;
    shortName: string;
    category: string;
    unit: string | null;
    numericValue: number;
    sourceType: string;
    verificationStatus: string;
    derived?: boolean;
  }): GameStatisticDto {
    return {
      statisticCode: input.code,
      name: input.name,
      shortName: input.shortName,
      category: input.category,
      unit: input.unit,
      numericValue: input.numericValue,
      sourceType: input.sourceType,
      verificationStatus: input.verificationStatus,
      derived: input.derived,
    };
  }

  async listDefinitionsBySportCode(code: string): Promise<StatisticDefinitionDto[]> {
    const sport = await this.prisma.client.sport.findUnique({
      where: { code: code.toUpperCase() },
    });
    if (!sport) {
      throw new NotFoundException({
        code: 'SPORT_NOT_FOUND',
        message: 'Sport not found',
      });
    }

    const defs = await this.prisma.client.statisticDefinition.findMany({
      where: { sportId: sport.id, active: true },
      orderBy: { displayOrder: 'asc' },
    });

    return defs.map((d) => this.mapDefinition(d));
  }

  private async requireOwnParticipation(athleteId: string, gameId: string) {
    const participation = await this.prisma.client.athleteGameParticipation.findUnique({
      where: {
        athleteId_gameId: { athleteId, gameId },
      },
      include: {
        game: true,
        athleteSeason: true,
        statistics: { include: { definition: true } },
      },
    });
    if (!participation) {
      throw new NotFoundException({
        code: 'GAME_NOT_FOUND',
        message: 'Game participation not found',
      });
    }
    return participation;
  }

  async listGameStatistics(
    user: AuthenticatedUser,
    gameId: string,
  ): Promise<GameStatisticDto[]> {
    const athlete = await this.requireAthlete(user.id);
    this.assertManage(user, athlete.userId);

    const participation = await this.requireOwnParticipation(athlete.id, gameId);
    return participation.statistics.map((stat) =>
      this.mapStatDto({
        code: stat.definition.code,
        name: stat.definition.name,
        shortName: stat.definition.shortName,
        category: stat.definition.category,
        unit: stat.definition.unit,
        numericValue: Number(stat.numericValue),
        sourceType: stat.sourceType,
        verificationStatus: stat.verificationStatus,
        derived: stat.definition.aggregationType === StatisticAggregationType.DERIVED,
      }),
    );
  }

  async upsertGameStatistics(
    user: AuthenticatedUser,
    gameId: string,
    input: UpsertGameStatisticsInput,
    requestId: string,
  ): Promise<GameStatisticDto[]> {
    const athlete = await this.requireAthlete(user.id);
    this.assertManage(user, athlete.userId);

    const verificationCheck = canSetVerificationStatus(user);
    if (verificationCheck.allowed) {
      // Defensive: Stage 5 athlete APIs never elevate verification.
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Athletes cannot set verification status',
      });
    }

    const participation = await this.requireOwnParticipation(athlete.id, gameId);
    const codes = input.statistics.map((s) => s.statisticCode.toUpperCase());

    const definitions = await this.prisma.client.statisticDefinition.findMany({
      where: {
        sportId: participation.game.sportId,
        code: { in: codes },
        active: true,
      },
    });

    const byCode = new Map(definitions.map((d) => [d.code, d]));

    for (const item of input.statistics) {
      const code = item.statisticCode.toUpperCase();
      const def = byCode.get(code);
      if (!def) {
        throw new BadRequestException({
          code: 'STATISTIC_DEFINITION_NOT_FOUND',
          message: `Statistic definition not found for code ${code}`,
        });
      }
      if (def.aggregationType === StatisticAggregationType.DERIVED) {
        throw new BadRequestException({
          code: 'DERIVED_STATISTIC_REJECTED',
          message: `Derived statistic ${code} cannot be entered directly`,
        });
      }
      if (item.numericValue < 0) {
        throw new BadRequestException({
          code: 'NEGATIVE_VALUE_REJECTED',
          message: `Negative values are not allowed for ${code}`,
        });
      }
    }

    await this.prisma.client.$transaction(async (tx) => {
      for (const item of input.statistics) {
        const code = item.statisticCode.toUpperCase();
        const def = byCode.get(code)!;

        const existing = await tx.athleteGameStatistic.findUnique({
          where: {
            athleteGameParticipationId_statisticDefinitionId: {
              athleteGameParticipationId: participation.id,
              statisticDefinitionId: def.id,
            },
          },
        });

        if (existing) {
          if (
            existing.sourceType !== DataSourceType.SELF_REPORTED ||
            existing.verificationStatus !== VerificationStatus.UNVERIFIED
          ) {
            throw new ForbiddenException({
              code: 'STATISTIC_LOCKED',
              message: `Statistic ${code} cannot be edited`,
            });
          }

          await tx.athleteGameStatistic.update({
            where: { id: existing.id },
            data: {
              numericValue: new Prisma.Decimal(item.numericValue),
              sourceType: DataSourceType.SELF_REPORTED,
              verificationStatus: VerificationStatus.UNVERIFIED,
              enteredByUserId: user.id,
            },
          });
        } else {
          await tx.athleteGameStatistic.create({
            data: {
              athleteGameParticipationId: participation.id,
              statisticDefinitionId: def.id,
              numericValue: new Prisma.Decimal(item.numericValue),
              sourceType: DataSourceType.SELF_REPORTED,
              verificationStatus: VerificationStatus.UNVERIFIED,
              enteredByUserId: user.id,
            },
          });
        }
      }
    });

    await this.auditService.record({
      actorType: 'user',
      actorId: user.id,
      action: 'athlete.statistics.updated',
      targetType: 'game',
      targetId: gameId,
      requestId,
      metadata: { codes },
    });

    return this.listGameStatistics(user, gameId);
  }

  async deleteGameStatistic(
    user: AuthenticatedUser,
    gameId: string,
    code: string,
  ): Promise<{ deleted: true }> {
    const athlete = await this.requireAthlete(user.id);
    this.assertManage(user, athlete.userId);

    const participation = await this.requireOwnParticipation(athlete.id, gameId);
    const def = await this.prisma.client.statisticDefinition.findUnique({
      where: {
        sportId_code: {
          sportId: participation.game.sportId,
          code: code.toUpperCase(),
        },
      },
    });
    if (!def) {
      throw new NotFoundException({
        code: 'STATISTIC_DEFINITION_NOT_FOUND',
        message: 'Statistic definition not found',
      });
    }

    const existing = await this.prisma.client.athleteGameStatistic.findUnique({
      where: {
        athleteGameParticipationId_statisticDefinitionId: {
          athleteGameParticipationId: participation.id,
          statisticDefinitionId: def.id,
        },
      },
    });

    if (!existing) {
      throw new NotFoundException({
        code: 'STATISTIC_NOT_FOUND',
        message: 'Statistic not found',
      });
    }

    if (
      existing.sourceType !== DataSourceType.SELF_REPORTED ||
      existing.verificationStatus !== VerificationStatus.UNVERIFIED
    ) {
      throw new ForbiddenException({
        code: 'STATISTIC_LOCKED',
        message: 'Only self-reported unverified statistics can be deleted',
      });
    }

    await this.prisma.client.athleteGameStatistic.delete({
      where: { id: existing.id },
    });

    return { deleted: true };
  }

  async getSeasonAggregates(
    user: AuthenticatedUser,
    athleteSeasonId: string,
  ): Promise<SeasonAggregateDto> {
    const athlete = await this.requireAthlete(user.id);
    this.assertManage(user, athlete.userId);

    const athleteSeason = await this.prisma.client.athleteSeason.findUnique({
      where: { id: athleteSeasonId },
      include: { season: true },
    });
    if (!athleteSeason || athleteSeason.athleteId !== athlete.id) {
      throw new NotFoundException({
        code: 'ATHLETE_SEASON_NOT_FOUND',
        message: 'Athlete season not found',
      });
    }

    const definitions = await this.prisma.client.statisticDefinition.findMany({
      where: { sportId: athleteSeason.sportId, active: true },
      orderBy: { displayOrder: 'asc' },
    });

    const participations = await this.prisma.client.athleteGameParticipation.findMany({
      where: {
        athleteId: athlete.id,
        OR: [
          { athleteSeasonId: athleteSeason.id },
          { game: { seasonId: athleteSeason.seasonId } },
        ],
      },
      include: {
        game: true,
        statistics: { include: { definition: true } },
      },
    });

    const values = participations.flatMap((p) =>
      p.statistics
        .filter((s) => s.definition.aggregationType !== StatisticAggregationType.DERIVED)
        .map((s) => ({
          code: s.definition.code,
          value: Number(s.numericValue),
          gameId: p.gameId,
          scheduledStart: p.game.scheduledStart,
        })),
    );

    const totalsMap = aggregateSeasonTotals(
      definitions.map((d) => ({
        code: d.code,
        aggregationType: d.aggregationType,
      })),
      values,
    );

    const totals: GameStatisticDto[] = [];
    for (const def of definitions) {
      if (def.aggregationType === StatisticAggregationType.DERIVED) {
        const derived = computeDerivedMetric(def.code, totalsMap);
        if (derived !== null) {
          totals.push(
            this.mapStatDto({
              code: def.code,
              name: def.name,
              shortName: def.shortName,
              category: def.category,
              unit: def.unit,
              numericValue: derived,
              sourceType: DataSourceType.SELF_REPORTED,
              verificationStatus: VerificationStatus.UNVERIFIED,
              derived: true,
            }),
          );
        }
        continue;
      }

      const value = totalsMap.get(def.code);
      if (value === null || value === undefined) {
        continue;
      }
      totals.push(
        this.mapStatDto({
          code: def.code,
          name: def.name,
          shortName: def.shortName,
          category: def.category,
          unit: def.unit,
          numericValue: value,
          sourceType: DataSourceType.SELF_REPORTED,
          verificationStatus: VerificationStatus.UNVERIFIED,
          derived: false,
        }),
      );
    }

    const gamesPlayed = participations.filter(
      (p) =>
        p.participationStatus === 'PARTICIPATED' ||
        p.participationStatus === 'CONFIRMED_ACTIVE' ||
        p.statistics.length > 0,
    ).length;

    return {
      seasonId: athleteSeason.seasonId,
      athleteSeasonId: athleteSeason.id,
      totals,
      gamesPlayed,
    };
  }

  async getGameByGameStats(
    user: AuthenticatedUser,
    athleteSeasonId: string,
  ): Promise<GameByGameStatRowDto[]> {
    const athlete = await this.requireAthlete(user.id);
    this.assertManage(user, athlete.userId);

    const athleteSeason = await this.prisma.client.athleteSeason.findUnique({
      where: { id: athleteSeasonId },
    });
    if (!athleteSeason || athleteSeason.athleteId !== athlete.id) {
      throw new NotFoundException({
        code: 'ATHLETE_SEASON_NOT_FOUND',
        message: 'Athlete season not found',
      });
    }

    const definitions = await this.prisma.client.statisticDefinition.findMany({
      where: { sportId: athleteSeason.sportId, active: true },
      orderBy: { displayOrder: 'asc' },
    });

    const participations = await this.prisma.client.athleteGameParticipation.findMany({
      where: {
        athleteId: athlete.id,
        OR: [
          { athleteSeasonId: athleteSeason.id },
          { game: { seasonId: athleteSeason.seasonId } },
        ],
      },
      include: {
        game: true,
        athleteSeason: true,
        statistics: { include: { definition: true } },
      },
      orderBy: { game: { scheduledStart: 'asc' } },
    });

    return participations.map((p) => {
      const { opponentName, homeAway } = resolveOpponent({
        homeTeamName: p.game.homeTeamName,
        awayTeamName: p.game.awayTeamName,
        athleteTeamName:
          p.athleteSeason?.selfReportedTeamName ?? athleteSeason.selfReportedTeamName,
      });

      const stored = new Map(
        p.statistics.map((s) => [s.definition.code, Number(s.numericValue)]),
      );
      const totalsMap = new Map<string, number | null>();
      for (const def of definitions) {
        if (def.aggregationType === StatisticAggregationType.DERIVED) {
          continue;
        }
        totalsMap.set(def.code, stored.has(def.code) ? stored.get(def.code)! : null);
      }

      const statistics: GameStatisticDto[] = [];
      for (const def of definitions) {
        if (def.aggregationType === StatisticAggregationType.DERIVED) {
          const derived = computeDerivedMetric(def.code, totalsMap);
          if (derived === null) continue;
          statistics.push(
            this.mapStatDto({
              code: def.code,
              name: def.name,
              shortName: def.shortName,
              category: def.category,
              unit: def.unit,
              numericValue: derived,
              sourceType: DataSourceType.SELF_REPORTED,
              verificationStatus: VerificationStatus.UNVERIFIED,
              derived: true,
            }),
          );
          continue;
        }

        const row = p.statistics.find((s) => s.definition.code === def.code);
        if (!row) continue;
        statistics.push(
          this.mapStatDto({
            code: def.code,
            name: def.name,
            shortName: def.shortName,
            category: def.category,
            unit: def.unit,
            numericValue: Number(row.numericValue),
            sourceType: row.sourceType,
            verificationStatus: row.verificationStatus,
            derived: false,
          }),
        );
      }

      return {
        gameId: p.gameId,
        scheduledStart: p.game.scheduledStart.toISOString(),
        opponentName,
        result: resolveResult({
          homeScore: p.game.homeScore,
          awayScore: p.game.awayScore,
          homeAway,
        }),
        statistics,
      };
    });
  }
}
