import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AdminModule } from './admin/admin.module';
import { AthletesModule } from './athletes/athletes.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { AuthorizationModule } from './authorization/authorization.module';
import { RequestContextMiddleware } from './common/request-context.middleware';
import { DatabaseModule } from './database/database.module';
import { GuardiansModule } from './guardians/guardians.module';
import { HealthModule } from './health/health.module';
import { RedisModule } from './redis/redis.module';
import { SportsModule } from './sports/sports.module';
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
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}
