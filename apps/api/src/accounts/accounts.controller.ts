import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequirePermission } from '../permissions/require-permission.decorator';
import { AccountsService } from './accounts.service';

@Controller()
@UseGuards(PermissionsGuard)
export class AccountsController {
  constructor(private readonly accounts: AccountsService) {}

  @Get('accounts')
  @RequirePermission('accounts:view')
  all() {
    return this.accounts.allProjectAccounts();
  }

  @Get('accounts/project/:projectId')
  @RequirePermission('accounts:view')
  project(@Param('projectId') projectId: string) {
    return this.accounts.projectAccount(projectId);
  }

  @Get('ledger')
  @RequirePermission('ledger:view')
  ledger(@Query('month') month?: string) {
    return this.accounts.ledger(month);
  }
}
