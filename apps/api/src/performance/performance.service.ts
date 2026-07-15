import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  canManageOwnCompetitionData,
  canViewPublicAthleteProfile,
} from '@scoutai/authorization';
import type {
  PerformanceResultDto,
  PerformanceTestDefinitionDto,
  PersonalBestDto,
  PublicPerformanceSection,
} from '@scoutai/contracts';
import {
  DataSourceType,
  StatisticAggregationType,
  VerificationStatus,
} from '@scoutai/domain';
import { Prisma } from '@scoutai/database';
import type { CreatePerformanceResultInput } from '@scoutai/validation';
import { AuditService } from '../audit/audit.service';
import type { AuthenticatedUser } from '../common/request-context';
import { PrismaService } from '../database/prisma.service';
import {
  aggregateSeasonTotals,
  pickPersonalBest,
  resolveOpponent,
  resolveResult,
  sourceLabel,
} from '../statistics/aggregation';

@Injectable()
export class PerformanceService {
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
    code: string;
    name: string;
    description: string | null;
    measurementType: string;
    unit: string;
    lowerIsBetter: boolean;
    sportId: string | null;
    displayOrder: number;
  }): PerformanceTestDefinitionDto {
    return {
      id: def.id,
      code: def.code,
      name: def.name,
      description: def.description,
      measurementType: def.measurementType,
      unit: def.unit,
      lowerIsBetter: def.lowerIsBetter,
      sportId: def.sportId,
      displayOrder: def.displayOrder,
    };
  }

  private mapResult(row: {
    id: string;
    numericValue: { toString(): string } | number;
    performedAt: Date;
    eventName: string | null;
    locationName: string | null;
    sourceType: string;
    verificationStatus: string;
    notes: string | null;
    definition: { code: string; name: string; unit: string };
  }): PerformanceResultDto {
    return {
      id: row.id,
      testCode: row.definition.code,
      testName: row.definition.name,
      unit: row.definition.unit,
      numericValue: Number(row.numericValue),
      performedAt: row.performedAt.toISOString(),
      eventName: row.eventName,
      locationName: row.locationName,
      sourceType: row.sourceType,
      verificationStatus: row.verificationStatus,
      sourceLabel: sourceLabel(row.sourceType),
      notes: row.notes,
    };
  }

  async listDefinitions(): Promise<PerformanceTestDefinitionDto[]> {
    const defs = await this.prisma.client.performanceTestDefinition.findMany({
      where: { active: true },
      orderBy: { displayOrder: 'asc' },
    });
    return defs.map((d) => this.mapDefinition(d));
  }

  async createResult(
    user: AuthenticatedUser,
    input: CreatePerformanceResultInput,
    requestId: string,
  ): Promise<PerformanceResultDto> {
    const athlete = await this.requireAthlete(user.id);
    this.assertManage(user, athlete.userId);

    const definition = await this.prisma.client.performanceTestDefinition.findUnique({
      where: { code: input.testCode.toUpperCase() },
    });
    if (!definition || !definition.active) {
      throw new NotFoundException({
        code: 'PERFORMANCE_TEST_NOT_FOUND',
        message: 'Performance test definition not found',
      });
    }

    const row = await this.prisma.client.performanceTestResult.create({
      data: {
        athleteId: athlete.id,
        performanceTestDefinitionId: definition.id,
        numericValue: new Prisma.Decimal(input.numericValue),
        performedAt: new Date(input.performedAt),
        eventName: input.eventName ?? null,
        locationName: input.locationName ?? null,
        notes: input.notes ?? null,
        sourceType: DataSourceType.SELF_REPORTED,
        verificationStatus: VerificationStatus.UNVERIFIED,
        enteredByUserId: user.id,
      },
      include: { definition: true },
    });

    await this.auditService.record({
      actorType: 'user',
      actorId: user.id,
      action: 'athlete.performance.created',
      targetType: 'performance_result',
      targetId: row.id,
      requestId,
      metadata: { testCode: definition.code },
    });

    return this.mapResult(row);
  }

  async listResults(user: AuthenticatedUser): Promise<PerformanceResultDto[]> {
    const athlete = await this.requireAthlete(user.id);
    this.assertManage(user, athlete.userId);

    const rows = await this.prisma.client.performanceTestResult.findMany({
      where: { athleteId: athlete.id },
      include: { definition: true },
      orderBy: { performedAt: 'desc' },
    });

    return rows.map((row) => this.mapResult(row));
  }

  async listBests(user: AuthenticatedUser): Promise<PersonalBestDto[]> {
    const athlete = await this.requireAthlete(user.id);
    this.assertManage(user, athlete.userId);

    const definitions = await this.prisma.client.performanceTestDefinition.findMany({
      where: { active: true },
      orderBy: { displayOrder: 'asc' },
    });

    const results = await this.prisma.client.performanceTestResult.findMany({
      where: { athleteId: athlete.id },
      include: { definition: true },
    });

    return definitions.map((def) => {
      const forTest = results
        .filter((r) => r.performanceTestDefinitionId === def.id)
        .map((r) => this.mapResult(r));

      const verified = forTest.filter(
        (r) => r.verificationStatus === VerificationStatus.VERIFIED,
      );

      return {
        testCode: def.code,
        testName: def.name,
        unit: def.unit,
        lowerIsBetter: def.lowerIsBetter,
        bestAvailable: pickPersonalBest(forTest, def.lowerIsBetter),
        bestVerified: pickPersonalBest(verified, def.lowerIsBetter),
      };
    });
  }

  async getPublicPerformance(
    slug: string,
    user: AuthenticatedUser | undefined,
  ): Promise<PublicPerformanceSection> {
    const athlete = await this.prisma.client.athlete.findUnique({
      where: { slug },
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

    const athleteSeasons = await this.prisma.client.athleteSeason.findMany({
      where: { athleteId: athlete.id },
      include: { season: { include: { sport: true } } },
      orderBy: { season: { year: 'desc' } },
    });

    const seasonSummaries: PublicPerformanceSection['seasonSummaries'] = [];

    for (const athleteSeason of athleteSeasons) {
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

      const totals: PublicPerformanceSection['seasonSummaries'][number]['totals'] = [];
      for (const def of definitions) {
        if (def.aggregationType === StatisticAggregationType.DERIVED) {
          continue;
        }
        const value = totalsMap.get(def.code);
        if (value === null || value === undefined) continue;
        totals.push({
          code: def.code,
          name: def.name,
          shortName: def.shortName,
          value,
          unit: def.unit,
          sourceLabel: sourceLabel(DataSourceType.SELF_REPORTED),
          verificationStatus: VerificationStatus.UNVERIFIED,
        });
      }

      if (totals.length > 0) {
        seasonSummaries.push({
          seasonName: athleteSeason.season.name,
          seasonYear: athleteSeason.season.year,
          totals,
        });
      }
    }

    const recentParticipations =
      await this.prisma.client.athleteGameParticipation.findMany({
        where: { athleteId: athlete.id },
        include: {
          game: true,
          athleteSeason: true,
        },
        orderBy: { game: { scheduledStart: 'desc' } },
        take: 5,
      });

    const recentGames = recentParticipations.map((p) => {
      const { opponentName, homeAway } = resolveOpponent({
        homeTeamName: p.game.homeTeamName,
        awayTeamName: p.game.awayTeamName,
        athleteTeamName: p.athleteSeason?.selfReportedTeamName,
      });
      return {
        scheduledStart: p.game.scheduledStart.toISOString(),
        opponentName,
        homeAway,
        result: resolveResult({
          homeScore: p.game.homeScore,
          awayScore: p.game.awayScore,
          homeAway,
        }),
        homeScore: p.game.homeScore,
        awayScore: p.game.awayScore,
      };
    });

    const definitions = await this.prisma.client.performanceTestDefinition.findMany({
      where: { active: true },
      orderBy: { displayOrder: 'asc' },
    });
    const results = await this.prisma.client.performanceTestResult.findMany({
      where: { athleteId: athlete.id },
      include: { definition: true },
    });

    const performanceBests = definitions.map((def) => {
      const forTest = results
        .filter((r) => r.performanceTestDefinitionId === def.id)
        .map((r) => this.mapResult(r));
      const verified = forTest.filter(
        (r) => r.verificationStatus === VerificationStatus.VERIFIED,
      );
      const bestVerified = pickPersonalBest(verified, def.lowerIsBetter);
      const bestAvailable = pickPersonalBest(forTest, def.lowerIsBetter);
      const shown = bestVerified ?? bestAvailable;

      return {
        testCode: def.code,
        testName: def.name,
        unit: def.unit,
        value: shown?.numericValue ?? null,
        sourceLabel: shown ? sourceLabel(shown.sourceType) : null,
        verificationStatus: shown?.verificationStatus ?? null,
        verifiedBestAvailable: !!bestVerified,
      };
    });

    return {
      seasonSummaries,
      recentGames,
      performanceBests,
    };
  }
}
