import { Body, Controller, Get, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import {
  inviteUserSchema,
  updatePermissionsSchema,
  type InviteUserInput,
  type UpdatePermissionsInput,
} from '@velvich/shared';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth-user';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { PermissionsService } from '../permissions/permissions.service';
import { RequirePermission } from '../permissions/require-permission.decorator';
import { ZodBody } from '../common/zod-validation.pipe';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from './users.service';

@Controller()
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly permissions: PermissionsService,
    private readonly prisma: PrismaService,
  ) {}

  /** Current principal + effective permissions - the web app calls this on load. */
  @Get('me')
  async me(@CurrentUser() user: AuthUser) {
    const effective = await this.permissions.getEffective(user.id, user.role);
    const org = await this.prisma.organization.findFirst({
      select: { id: true, name: true, settings: true, logoKey: true },
    });
    return {
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      permissions: [...effective],
      organization: org,
    };
  }

  @Get('users')
  @UseGuards(PermissionsGuard)
  @RequirePermission('users:manage')
  list() {
    return this.users.list();
  }

  @Post('users')
  @UseGuards(PermissionsGuard)
  @RequirePermission('users:manage')
  invite(@Body(new ZodBody(inviteUserSchema)) dto: InviteUserInput) {
    return this.users.invite(dto);
  }

  @Patch('users/:id/status')
  @UseGuards(PermissionsGuard)
  @RequirePermission('users:manage')
  setStatus(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body('status') status: 'ACTIVE' | 'INACTIVE',
  ) {
    return this.users.setStatus(actor, id, status);
  }

  @Patch('users/:id/role')
  @UseGuards(PermissionsGuard)
  @RequirePermission('users:manage')
  setRole(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body('role') role: AuthUser['role'],
  ) {
    return this.users.setRole(actor, id, role);
  }

  @Get('users/:id/permissions')
  @UseGuards(PermissionsGuard)
  @RequirePermission('permissions:manage')
  getPermissions(@Param('id') id: string) {
    return this.users.getPermissions(id);
  }

  @Put('users/:id/permissions')
  @UseGuards(PermissionsGuard)
  @RequirePermission('permissions:manage')
  updatePermissions(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body(new ZodBody(updatePermissionsSchema)) dto: UpdatePermissionsInput,
  ) {
    return this.users.updatePermissions(actor, id, dto.changes);
  }
}
