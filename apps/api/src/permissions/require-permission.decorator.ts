import { SetMetadata } from '@nestjs/common';
import type { Capability } from '@velvich/shared';

export const REQUIRE_PERMISSION_KEY = 'requirePermission';

/**
 * Guard a route with one or more capabilities (AND semantics - the user must
 * hold every listed capability). Enforced server-side by PermissionsGuard.
 *
 *   @RequirePermission('transactions:create')
 *   @RequirePermission('documents:view', 'documents:delete')
 */
export const RequirePermission = (...capabilities: Capability[]) =>
  SetMetadata(REQUIRE_PERMISSION_KEY, capabilities);
