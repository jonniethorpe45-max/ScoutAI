import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AdminModule } from './admin/admin.module';
import { AthletesModule } from './athletes/athletes.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { AuthorizationModule } from './authorization/authorization.module';
import { RequestContextMiddleware } from './common/request-context.middleware';
import { DatabaseModule } from './database/database.module';
import { GamesModule } from './games/games.module';
import { GuardiansModule } from './guardians/guardians.module';
import { HealthModule } from './health/health.module';
import { PerformanceModule } from './performance/performance.module';
import { RedisModule } from './redis/redis.module';
import { SeasonsModule } from './seasons/seasons.module';
import { SportsModule } from './sports/sports.module';
import { StatisticsModule } from './statistics/statistics.module';
import { TeamsModule } from './teams/teams.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    DatabaseModule,
    RedisModule,
    AuditModule,
    HealthModule,
    AuthModule,
    UsersModule,
    AuthorizationModule,
    AdminModule,
    SportsModule,
    AthletesModule,
    GuardiansModule,
    SeasonsModule,
    TeamsModule,
    GamesModule,
    StatisticsModule,
    PerformanceModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}
