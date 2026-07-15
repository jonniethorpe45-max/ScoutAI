import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  createPerformanceResultSchema,
  type CreatePerformanceResultInput,
} from '@scoutai/validation';
import { AuthGuard } from '../auth/auth.guard';
import { OptionalAuthGuard } from '../auth/optional-auth.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { PerformanceService } from './performance.service';

@Controller('athletes/me/performance')
export class PerformanceController {
  constructor(
    @Inject(PerformanceService) private readonly performanceService: PerformanceService,
  ) {}

  @Get('definitions')
  @UseGuards(AuthGuard)
  listDefinitions() {
    return this.performanceService.listDefinitions();
  }

  @Post('results')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  createResult(
    @Body(new ZodValidationPipe(createPerformanceResultSchema))
    body: CreatePerformanceResultInput,
    @Req() request: Request,
  ) {
    return this.performanceService.createResult(request.user!, body, request.requestId);
  }

  @Get('results')
  @UseGuards(AuthGuard)
  listResults(@Req() request: Request) {
    return this.performanceService.listResults(request.user!);
  }

  @Get('bests')
  @UseGuards(AuthGuard)
  listBests(@Req() request: Request) {
    return this.performanceService.listBests(request.user!);
  }
}

@Controller('athletes/public')
export class PublicPerformanceController {
  constructor(
    @Inject(PerformanceService) private readonly performanceService: PerformanceService,
  ) {}

  @Get(':slug/performance')
  @UseGuards(OptionalAuthGuard)
  getPublicPerformance(@Param('slug') slug: string, @Req() request: Request) {
    return this.performanceService.getPublicPerformance(slug, request.user);
  }
}
