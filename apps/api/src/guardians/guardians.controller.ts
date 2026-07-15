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
  guardianInviteSchema,
  type GuardianInviteInput,
} from '@scoutai/validation';
import { AuthGuard } from '../auth/auth.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import {
  GuardiansService,
  type GuardianAcceptView,
  type GuardianInviteView,
  type GuardianLinksResponse,
  type GuardianRevokeView,
} from './guardians.service';

@Controller('guardians')
export class GuardiansController {
  constructor(@Inject(GuardiansService) private readonly guardiansService: GuardiansService) {}

  @Post('invites')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  invite(
    @Body(new ZodValidationPipe(guardianInviteSchema)) body: GuardianInviteInput,
    @Req() request: Request,
  ): Promise<GuardianInviteView> {
    return this.guardiansService.invite(request.user!, body, request.requestId);
  }

  @Post('invites/:id/accept')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  accept(@Param('id') id: string, @Req() request: Request): Promise<GuardianAcceptView> {
    return this.guardiansService.accept(request.user!, id, request.requestId);
  }

  @Post('invites/:id/revoke')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  revoke(@Param('id') id: string, @Req() request: Request): Promise<GuardianRevokeView> {
    return this.guardiansService.revoke(request.user!, id, request.requestId);
  }

  @Get('links')
  @UseGuards(AuthGuard)
  listLinks(@Req() request: Request): Promise<GuardianLinksResponse> {
    return this.guardiansService.listLinks(request.user!);
  }
}
