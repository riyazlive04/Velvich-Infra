import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { staffSchema, type StaffInput } from '@velvich/shared';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth-user';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequirePermission } from '../permissions/require-permission.decorator';
import { ZodBody } from '../common/zod-validation.pipe';
import { StaffService } from './staff.service';

@Controller('staff')
@UseGuards(PermissionsGuard)
export class StaffController {
  constructor(private readonly staff: StaffService) {}

  @Get()
  @RequirePermission('staff:view')
  list() {
    return this.staff.list();
  }

  @Post()
  @RequirePermission('staff:manage')
  create(@CurrentUser() actor: AuthUser, @Body(new ZodBody(staffSchema)) dto: StaffInput) {
    return this.staff.create(actor, dto);
  }

  @Put(':id')
  @RequirePermission('staff:manage')
  update(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body(new ZodBody(staffSchema)) dto: StaffInput,
  ) {
    return this.staff.update(actor, id, dto);
  }

  @Delete(':id')
  @RequirePermission('staff:manage')
  remove(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    return this.staff.remove(actor, id);
  }
}
