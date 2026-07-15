import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { addRosterMemberSchema } from '@scoutai/validation';
import { AuthGuard } from '../auth/auth.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import type { AuthenticatedUser } from '../common/request-context';
import { OrganizationsService } from './organizations.service';

@Controller('organizations')
export class OrganizationsController {
  constructor(
    @Inject(OrganizationsService) private readonly organizationsService: OrganizationsService,
  ) {}

  @Get('mine')
  @UseGuards(AuthGuard)
  listMine(@Req() request: { user: AuthenticatedUser }) {
    return this.organizationsService.listMine(request.user);
  }

  @Get(':id')
  @UseGuards(AuthGuard)
  getOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.organizationsService.getOrganization(id);
  }

  @Get(':id/roster')
  @UseGuards(AuthGuard)
  getRoster(
    @Req() request: { user: AuthenticatedUser; requestId: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.organizationsService.getRoster(request.user, id, request.requestId);
  }

  @Post(':id/roster')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  addMember(
    @Req() request: { user: AuthenticatedUser; requestId: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(addRosterMemberSchema))
    body: ReturnType<typeof addRosterMemberSchema.parse>,
  ) {
    return this.organizationsService.addRosterMember(request.user, id, body, request.requestId);
  }

  @Delete(':id/roster/:userId')
  @UseGuards(AuthGuard)
  removeMember(
    @Req() request: { user: AuthenticatedUser; requestId: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.organizationsService.removeRosterMember(
      request.user,
      id,
      userId,
      request.requestId,
    );
  }
}
