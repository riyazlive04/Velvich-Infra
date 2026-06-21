import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { fromNodeHeaders } from 'better-auth/node';
import type { Request } from 'express';
import type { RoleName } from '@velvich/shared';
import { auth } from './auth.config';
import { IS_PUBLIC_KEY } from './public.decorator';

/**
 * Validates the Better Auth session cookie on every request and attaches the
 * authenticated user. Routes marked @Public() are skipped. Inactive users are
 * rejected even with a valid session.
 *
 * Registered as a global guard (see AuthModule) so endpoints are deny-by-default.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<Request>();
    const result = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });

    if (!result?.user) {
      throw new UnauthorizedException('Authentication required');
    }

    const user = result.user as typeof result.user & { role?: string; status?: string };
    if (user.status === 'INACTIVE') {
      throw new UnauthorizedException('Account is inactive');
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: (user.role ?? 'VIEWER') as RoleName,
      status: (user.status ?? 'ACTIVE') as 'ACTIVE' | 'INACTIVE',
    };
    req.sessionId = result.session?.id;

    return true;
  }
}
