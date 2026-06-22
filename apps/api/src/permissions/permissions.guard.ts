import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { Capability } from '@velvich/shared';
import { PermissionsService } from './permissions.service';
import { REQUIRE_PERMISSION_KEY } from './require-permission.decorator';

/**
 * Server-side authorization. Reads required capabilities from @RequirePermission
 * and checks them against the user's effective permission set. The effective set
 * is computed once and cached on the request to avoid repeat DB hits.
 *
 * This is the source of truth - UI gating is convenience only.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissions: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<Capability[] | undefined>(
      REQUIRE_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required || required.length === 0) return true;

    const req = context.switchToHttp().getRequest<
      Request & { _effectivePermissions?: Set<Capability> }
    >();
    const user = req.user;
    if (!user) throw new ForbiddenException('Not authenticated');

    if (!req._effectivePermissions) {
      req._effectivePermissions = await this.permissions.getEffective(user.id, user.role);
    }
    const effective = req._effectivePermissions;

    const missing = required.filter((cap) => !effective.has(cap));
    if (missing.length > 0) {
      throw new ForbiddenException(`Missing permission: ${missing.join(', ')}`);
    }
    return true;
  }
}
