import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import {
  PerformanceController,
  PublicPerformanceController,
} from './performance.controller';
import { PerformanceService } from './performance.service';

@Module({
  imports: [AuthModule],
  controllers: [PerformanceController, PublicPerformanceController],
  providers: [PerformanceService],
  exports: [PerformanceService],
})
export class PerformanceModule {}
