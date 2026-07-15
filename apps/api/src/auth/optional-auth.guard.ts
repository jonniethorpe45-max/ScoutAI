import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { getEnv } from '@scoutai/config';
import type { Request } from 'express';
import type { UserRoleType } from '@scoutai/domain';
import type { UserStatus } from '@scoutai/database';
import { SessionService } from './session.service';

/**
 * Optional authentication: attaches request.user when a valid session exists,
 * but does not reject anonymous requests.
 */
@Injectable()
export class OptionalAuthGuard implements CanActivate {
  constructor(@Inject(SessionService) private readonly sessionService: SessionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const env = getEnv();
    const rawToken =
      request.cookies?.[env.SESSION_COOKIE_NAME] ??
      this.sessionService.readSessionToken(request.headers.cookie, env.SESSION_COOKIE_NAME);

    if (!rawToken) {
      return true;
    }

    const session = await this.sessionService.findValidSession(rawToken);
    if (!session || session.user.status !== 'ACTIVE') {
      return true;
    }

    request.user = {
      id: session.user.id,
      email: session.user.email,
      roles: session.user.roles.map((role) => role.role as UserRoleType),
      status: session.user.status as UserStatus,
    };

    return true;
  }
}
