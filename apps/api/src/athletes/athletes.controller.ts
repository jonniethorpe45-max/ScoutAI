import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  academicSchema,
  advanceOnboardingSchema,
  biographySchema,
  createAthleteSchema,
  physicalSchema,
  recruitingSchema,
  schoolTeamSchema,
  setPositionsSchema,
  setSportSchema,
  updateIdentitySchema,
  visibilitySchema,
  type AcademicInput,
  type AdvanceOnboardingInput,
  type BiographyInput,
  type CreateAthleteInput,
  type PhysicalInput,
  type RecruitingInput,
  type SchoolTeamInput,
  type SetPositionsInput,
  type SetSportInput,
  type UpdateIdentityInput,
  type VisibilityInput,
} from '@scoutai/validation';
import { AuthGuard } from '../auth/auth.guard';
import { OptionalAuthGuard } from '../auth/optional-auth.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { AthletesService } from './athletes.service';

@Controller('athletes')
export class AthletesController {
  constructor(@Inject(AthletesService) private readonly athletesService: AthletesService) {}

  @Get('me')
  @UseGuards(AuthGuard)
  getMine(@Req() request: Request) {
    return this.athletesService.getMine(request.user!);
  }

  @Post('me')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  createMine(
    @Body(new ZodValidationPipe(createAthleteSchema)) body: CreateAthleteInput,
    @Req() request: Request,
  ) {
    return this.athletesService.createMine(request.user!, body, request.requestId);
  }

  @Patch('me/identity')
  @UseGuards(AuthGuard)
  updateIdentity(
    @Body(new ZodValidationPipe(updateIdentitySchema)) body: UpdateIdentityInput,
    @Req() request: Request,
  ) {
    return this.athletesService.updateIdentity(request.user!, body, request.requestId);
  }

  @Patch('me/sport')
  @UseGuards(AuthGuard)
  setSport(
    @Body(new ZodValidationPipe(setSportSchema)) body: SetSportInput,
    @Req() request: Request,
  ) {
    return this.athletesService.setSport(request.user!, body, request.requestId);
  }

  @Patch('me/positions')
  @UseGuards(AuthGuard)
  setPositions(
    @Body(new ZodValidationPipe(setPositionsSchema)) body: SetPositionsInput,
    @Req() request: Request,
  ) {
    return this.athletesService.setPositions(request.user!, body, request.requestId);
  }

  @Patch('me/physical')
  @UseGuards(AuthGuard)
  updatePhysical(
    @Body(new ZodValidationPipe(physicalSchema)) body: PhysicalInput,
    @Req() request: Request,
  ) {
    return this.athletesService.updatePhysical(request.user!, body, request.requestId);
  }

  @Patch('me/academic')
  @UseGuards(AuthGuard)
  updateAcademic(
    @Body(new ZodValidationPipe(academicSchema)) body: AcademicInput,
    @Req() request: Request,
  ) {
    return this.athletesService.updateAcademic(request.user!, body, request.requestId);
  }

  @Patch('me/recruiting')
  @UseGuards(AuthGuard)
  updateRecruiting(
    @Body(new ZodValidationPipe(recruitingSchema)) body: RecruitingInput,
    @Req() request: Request,
  ) {
    return this.athletesService.updateRecruiting(request.user!, body, request.requestId);
  }

  @Patch('me/biography')
  @UseGuards(AuthGuard)
  updateBiography(
    @Body(new ZodValidationPipe(biographySchema)) body: BiographyInput,
    @Req() request: Request,
  ) {
    return this.athletesService.updateBiography(request.user!, body, request.requestId);
  }

  @Patch('me/school-team')
  @UseGuards(AuthGuard)
  updateSchoolTeam(
    @Body(new ZodValidationPipe(schoolTeamSchema)) body: SchoolTeamInput,
    @Req() request: Request,
  ) {
    return this.athletesService.updateSchoolTeam(request.user!, body, request.requestId);
  }

  @Patch('me/visibility')
  @UseGuards(AuthGuard)
  updateVisibility(
    @Body(new ZodValidationPipe(visibilitySchema)) body: VisibilityInput,
    @Req() request: Request,
  ) {
    return this.athletesService.updateVisibility(request.user!, body, request.requestId);
  }

  @Get('me/onboarding')
  @UseGuards(AuthGuard)
  getOnboarding(@Req() request: Request) {
    return this.athletesService.getOnboarding(request.user!);
  }

  @Patch('me/onboarding')
  @UseGuards(AuthGuard)
  advanceOnboarding(
    @Body(new ZodValidationPipe(advanceOnboardingSchema)) body: AdvanceOnboardingInput,
    @Req() request: Request,
  ) {
    return this.athletesService.advanceOnboarding(request.user!, body, request.requestId);
  }

  @Get('me/completeness')
  @UseGuards(AuthGuard)
  getCompleteness(@Req() request: Request) {
    return this.athletesService.getCompleteness(request.user!);
  }

  @Post('me/publish')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  publish(@Req() request: Request) {
    return this.athletesService.publish(request.user!, request.requestId);
  }

  @Post('me/unpublish')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  unpublish(@Req() request: Request) {
    return this.athletesService.unpublish(request.user!, request.requestId);
  }

  @Get('public/:slug')
  @UseGuards(OptionalAuthGuard)
  getPublicBySlug(@Param('slug') slug: string, @Req() request: Request) {
    return this.athletesService.getPublicBySlug(slug, request.user);
  }
}
