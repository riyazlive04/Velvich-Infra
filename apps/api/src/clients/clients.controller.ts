import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { clientSchema, type ClientInput } from '@velvich/shared';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth-user';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequirePermission } from '../permissions/require-permission.decorator';
import { ZodBody } from '../common/zod-validation.pipe';
import { ClientsService } from './clients.service';

@Controller('clients')
@UseGuards(PermissionsGuard)
export class ClientsController {
  constructor(private readonly clients: ClientsService) {}

  @Get()
  @RequirePermission('clients:view')
  list(@Query('search') search?: string) {
    return this.clients.list(search);
  }

  @Get(':id')
  @RequirePermission('clients:view')
  get(@Param('id') id: string) {
    return this.clients.get(id);
  }

  @Post()
  @RequirePermission('clients:manage')
  create(@CurrentUser() actor: AuthUser, @Body(new ZodBody(clientSchema)) dto: ClientInput) {
    return this.clients.create(actor, dto);
  }

  @Put(':id')
  @RequirePermission('clients:manage')
  update(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body(new ZodBody(clientSchema)) dto: ClientInput,
  ) {
    return this.clients.update(actor, id, dto);
  }

  @Delete(':id')
  @RequirePermission('clients:manage')
  remove(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    return this.clients.remove(actor, id);
  }
}
