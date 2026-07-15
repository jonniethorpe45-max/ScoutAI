import { Controller, Get, Inject, Param } from '@nestjs/common';
import { SportsService } from './sports.service';

@Controller('sports')
export class SportsController {
  constructor(@Inject(SportsService) private readonly sportsService: SportsService) {}

  @Get()
  listSports() {
    return this.sportsService.listSports();
  }

  @Get(':code/positions')
  listPositions(@Param('code') code: string) {
    return this.sportsService.listPositionsBySportCode(code);
  }
}
