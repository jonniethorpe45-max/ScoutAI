import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import {
  AthleteSeasonsController,
  SeasonsCatalogController,
} from './seasons.controller';
import { SeasonsService } from './seasons.service';

@Module({
  imports: [AuthModule],
  controllers: [AthleteSeasonsController, SeasonsCatalogController],
  providers: [SeasonsService],
  exports: [SeasonsService],
})
export class SeasonsModule {}
