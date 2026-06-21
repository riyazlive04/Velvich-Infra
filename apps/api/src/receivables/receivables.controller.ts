import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { receivableSchema, type ReceivableInput } from '@velvich/shared';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth-user';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequirePermission } from '../permissions/require-permission.decorator';
import { ZodBody } from '../common/zod-validation.pipe';
import { ReceivablesService } from './receivables.service';

@Controller('receivables')
@UseGuards(PermissionsGuard)
export class ReceivablesController {
  constructor(private readonly receivables: ReceivablesService) {}

  @Get()
  @RequirePermission('receivables:view')
  list() {
    return this.receivables.list();
  }

  @Post()
  @RequirePermission('receivables:manage')
  create(@CurrentUser() actor: AuthUser, @Body(new ZodBody(receivableSchema)) dto: ReceivableInput) {
    return this.receivables.create(actor, dto);
  }

  @Post(':id/follow-up')
  @RequirePermission('receivables:manage')
  followUp(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body('outcome') outcome?: string,
  ) {
    return this.receivables.addFollowUp(actor, id, outcome);
  }

  @Post(':id/received')
  @RequirePermission('receivables:manage')
  markReceived(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    return this.receivables.markReceived(actor, id);
  }
}
