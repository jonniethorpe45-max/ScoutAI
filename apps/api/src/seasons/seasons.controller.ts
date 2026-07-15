import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  createAthleteSeasonSchema,
  createSeasonSchema,
  updateAthleteSeasonSchema,
  type CreateAthleteSeasonInput,
  type CreateSeasonInput,
  type UpdateAthleteSeasonInput,
} from '@scoutai/validation';
import { AuthGuard } from '../auth/auth.guard';
import { OptionalAuthGuard } from '../auth/optional-auth.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { SeasonsService } from './seasons.service';

@Controller('athletes/me/seasons')
export class AthleteSeasonsController {
  constructor(@Inject(SeasonsService) private readonly seasonsService: SeasonsService) {}

  @Get()
  @UseGuards(AuthGuard)
  listMine(@Req() request: Request) {
    return this.seasonsService.listMine(request.user!);
  }

  @Post('catalog')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  createFromCatalog(
    @Body(new ZodValidationPipe(createSeasonSchema)) body: CreateSeasonInput,
    @Req() request: Request,
  ) {
    return this.seasonsService.createFromCatalog(request.user!, body, request.requestId);
  }

  @Post()
  @HttpCode(200)
  @UseGuards(AuthGuard)
  createAthleteSeason(
    @Body(new ZodValidationPipe(createAthleteSeasonSchema)) body: CreateAthleteSeasonInput,
    @Req() request: Request,
  ) {
    return this.seasonsService.createAthleteSeason(request.user!, body, request.requestId);
  }

  @Get(':id')
  @UseGuards(AuthGuard)
  getMine(@Param('id') id: string, @Req() request: Request) {
    return this.seasonsService.getMine(request.user!, id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  updateMine(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateAthleteSeasonSchema)) body: UpdateAthleteSeasonInput,
    @Req() request: Request,
  ) {
    return this.seasonsService.updateMine(request.user!, id, body, request.requestId);
  }
}

@Controller('seasons')
export class SeasonsCatalogController {
  constructor(@Inject(SeasonsService) private readonly seasonsService: SeasonsService) {}

  @Get()
  @UseGuards(OptionalAuthGuard)
  listCatalog(@Query('sportCode') sportCode: string) {
    return this.seasonsService.listCatalog(sportCode ?? '');
  }
}
