import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { guardianInviteSchema } from '@scoutai/validation';
import { AuthGuard } from '../auth/auth.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import type { AuthenticatedUser } from '../common/request-context';
import { GuardiansService } from './guardians.service';

@Controller('guardians')
export class GuardiansController {
  constructor(@Inject(GuardiansService) private readonly guardiansService: GuardiansService) {}

  @Get('links')
  @UseGuards(AuthGuard)
  listLinks(@Req() request: { user: AuthenticatedUser }) {
    return this.guardiansService.listMine(request.user);
  }

  @Get('athletes')
  @UseGuards(AuthGuard)
  listAthletes(@Req() request: { user: AuthenticatedUser }) {
    return this.guardiansService.listLinkedAthletes(request.user);
  }

  @Post('invites')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  invite(
    @Req() request: { user: AuthenticatedUser; requestId: string },
    @Body(new ZodValidationPipe(guardianInviteSchema))
    body: ReturnType<typeof guardianInviteSchema.parse>,
  ) {
    return this.guardiansService.invite(request.user, body, request.requestId);
  }

  @Post('invites/:id/accept')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  accept(
    @Req() request: { user: AuthenticatedUser; requestId: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.guardiansService.accept(request.user, id, request.requestId);
  }

  @Post('invites/:id/revoke')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  revoke(
    @Req() request: { user: AuthenticatedUser; requestId: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.guardiansService.revoke(request.user, id, request.requestId);
  }
}
