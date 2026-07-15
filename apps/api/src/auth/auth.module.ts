import { Module } from '@nestjs/common';
import { RateLimitGuard } from '../common/rate-limit.guard';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { OptionalAuthGuard } from './optional-auth.guard';
import { SessionService } from './session.service';

@Module({
  controllers: [AuthController],
  providers: [AuthService, SessionService, AuthGuard, OptionalAuthGuard, RateLimitGuard],
  exports: [AuthService, SessionService, AuthGuard, OptionalAuthGuard],
})
export class AuthModule {}
