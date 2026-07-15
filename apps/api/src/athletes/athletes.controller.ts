import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { upsertAthleteProfileSchema } from '@scoutai/validation';
import { AuthGuard } from '../auth/auth.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import type { AuthenticatedUser } from '../common/request-context';
import { AthletesService } from './athletes.service';

@Controller('athletes')
export class AthletesController {
  constructor(@Inject(AthletesService) private readonly athletesService: AthletesService) {}

  @Get('me')
  @UseGuards(AuthGuard)
  getMine(@Req() request: { user: AuthenticatedUser; requestId: string }) {
    return this.athletesService.getMine(request.user);
  }

  @Put('me')
  @UseGuards(AuthGuard)
  upsertMine(
    @Req() request: { user: AuthenticatedUser; requestId: string },
    @Body(new ZodValidationPipe(upsertAthleteProfileSchema))
    body: ReturnType<typeof upsertAthleteProfileSchema.parse>,
  ) {
    return this.athletesService.upsertMine(request.user, body, request.requestId);
  }

  @Get(':id')
  @UseGuards(AuthGuard)
  getById(
    @Req() request: { user: AuthenticatedUser; requestId: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.athletesService.getById(request.user, id, request.requestId);
  }
}
