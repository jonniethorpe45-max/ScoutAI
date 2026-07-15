import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  upsertGameStatisticsSchema,
  type UpsertGameStatisticsInput,
} from '@scoutai/validation';
import { AuthGuard } from '../auth/auth.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { StatisticsService } from './statistics.service';

@Controller()
export class StatisticsController {
  constructor(
    @Inject(StatisticsService) private readonly statisticsService: StatisticsService,
  ) {}

  @Get('sports/:code/statistics')
  listDefinitions(@Param('code') code: string) {
    return this.statisticsService.listDefinitionsBySportCode(code);
  }

  @Get('athletes/me/games/:gameId/statistics')
  @UseGuards(AuthGuard)
  listGameStatistics(@Param('gameId') gameId: string, @Req() request: Request) {
    return this.statisticsService.listGameStatistics(request.user!, gameId);
  }

  @Put('athletes/me/games/:gameId/statistics')
  @UseGuards(AuthGuard)
  upsertGameStatistics(
    @Param('gameId') gameId: string,
    @Body(new ZodValidationPipe(upsertGameStatisticsSchema)) body: UpsertGameStatisticsInput,
    @Req() request: Request,
  ) {
    return this.statisticsService.upsertGameStatistics(
      request.user!,
      gameId,
      body,
      request.requestId,
    );
  }

  @Delete('athletes/me/games/:gameId/statistics/:code')
  @UseGuards(AuthGuard)
  deleteGameStatistic(
    @Param('gameId') gameId: string,
    @Param('code') code: string,
    @Req() request: Request,
  ) {
    return this.statisticsService.deleteGameStatistic(request.user!, gameId, code);
  }

  @Get('athletes/me/seasons/:athleteSeasonId/aggregates')
  @UseGuards(AuthGuard)
  getSeasonAggregates(
    @Param('athleteSeasonId') athleteSeasonId: string,
    @Req() request: Request,
  ) {
    return this.statisticsService.getSeasonAggregates(request.user!, athleteSeasonId);
  }

  @Get('athletes/me/seasons/:athleteSeasonId/game-stats')
  @UseGuards(AuthGuard)
  getGameByGameStats(
    @Param('athleteSeasonId') athleteSeasonId: string,
    @Req() request: Request,
  ) {
    return this.statisticsService.getGameByGameStats(request.user!, athleteSeasonId);
  }
}
