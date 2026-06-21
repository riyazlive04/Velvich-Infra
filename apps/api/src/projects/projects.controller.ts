import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  projectSchema,
  stageChangeSchema,
  type ProjectInput,
  type StageChangeInput,
} from '@velvich/shared';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth-user';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequirePermission } from '../permissions/require-permission.decorator';
import { ZodBody } from '../common/zod-validation.pipe';
import { ProjectsService } from './projects.service';

@Controller('projects')
@UseGuards(PermissionsGuard)
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Get()
  @RequirePermission('projects:view')
  list(
    @Query('stage') stage?: string,
    @Query('clientId') clientId?: string,
    @Query('search') search?: string,
  ) {
    return this.projects.list({ stage, clientId, search });
  }

  @Get('board')
  @RequirePermission('pipeline:view')
  board() {
    return this.projects.board();
  }

  @Get(':id')
  @RequirePermission('projects:view')
  get(@Param('id') id: string) {
    return this.projects.get(id);
  }

  @Post()
  @RequirePermission('projects:create')
  create(@CurrentUser() actor: AuthUser, @Body(new ZodBody(projectSchema)) dto: ProjectInput) {
    return this.projects.create(actor, dto);
  }

  @Put(':id')
  @RequirePermission('projects:edit')
  update(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body(new ZodBody(projectSchema)) dto: ProjectInput,
  ) {
    return this.projects.update(actor, id, dto);
  }

  @Patch(':id/stage')
  @RequirePermission('projects:edit')
  changeStage(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body(new ZodBody(stageChangeSchema)) dto: StageChangeInput,
  ) {
    return this.projects.changeStage(actor, id, dto);
  }

  @Delete(':id')
  @RequirePermission('projects:delete')
  remove(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    return this.projects.remove(actor, id);
  }
}
