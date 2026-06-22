import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth-user';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequirePermission } from '../permissions/require-permission.decorator';
import { ImportService, type ImportPayload } from './import.service';

@Controller('import')
@UseGuards(PermissionsGuard)
export class ImportController {
  constructor(private readonly importer: ImportService) {}

  // Migration is an Owner-grade action - gate on settings:manage.
  @Post('prototype')
  @RequirePermission('settings:manage')
  run(@CurrentUser() actor: AuthUser, @Body() payload: ImportPayload) {
    return this.importer.run(actor, payload);
  }
}
