import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthUser } from './auth-user';

/** Injects the authenticated AuthUser, throwing if (somehow) absent. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const req = ctx.switchToHttp().getRequest<Request>();
    if (!req.user) throw new UnauthorizedException('Not authenticated');
    return req.user;
  },
);
