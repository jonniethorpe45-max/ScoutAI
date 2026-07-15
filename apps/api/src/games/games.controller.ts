import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  createGameSchema,
  updateGameSchema,
  upsertParticipationSchema,
  type CreateGameInput,
  type UpdateGameInput,
  type UpsertParticipationInput,
} from '@scoutai/validation';
import { AuthGuard } from '../auth/auth.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { GamesService } from './games.service';

@Controller('athletes/me/games')
export class GamesController {
  constructor(@Inject(GamesService) private readonly gamesService: GamesService) {}

  @Get()
  @UseGuards(AuthGuard)
  listMine(@Query('seasonId') seasonId: string | undefined, @Req() request: Request) {
    return this.gamesService.listMine(request.user!, seasonId);
  }

  @Post()
  @HttpCode(200)
  @UseGuards(AuthGuard)
  createMine(
    @Body(new ZodValidationPipe(createGameSchema)) body: CreateGameInput,
    @Req() request: Request,
  ) {
    return this.gamesService.createMine(request.user!, body, request.requestId);
  }

  @Get(':id')
  @UseGuards(AuthGuard)
  getMine(@Param('id') id: string, @Req() request: Request) {
    return this.gamesService.getMine(request.user!, id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  updateMine(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateGameSchema)) body: UpdateGameInput,
    @Req() request: Request,
  ) {
    return this.gamesService.updateMine(request.user!, id, body, request.requestId);
  }

  @Put(':id/participation')
  @UseGuards(AuthGuard)
  upsertParticipation(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(upsertParticipationSchema)) body: UpsertParticipationInput,
    @Req() request: Request,
  ) {
    return this.gamesService.upsertParticipation(
      request.user!,
      id,
      body,
      request.requestId,
    );
  }
}
