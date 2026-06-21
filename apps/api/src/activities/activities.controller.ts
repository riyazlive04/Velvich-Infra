import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { activitySchema, type ActivityInput } from '@velvich/shared';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth-user';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequirePermission } from '../permissions/require-permission.decorator';
import { ZodBody } from '../common/zod-validation.pipe';
import { StorageService } from '../storage/storage.service';
import { ActivitiesService } from './activities.service';

@Controller('activities')
@UseGuards(PermissionsGuard)
export class ActivitiesController {
  constructor(
    private readonly activities: ActivitiesService,
    private readonly storage: StorageService,
  ) {}

  @Get()
  @RequirePermission('activities:view')
  list(@Query('projectId') projectId?: string) {
    return this.activities.list(projectId);
  }

  @Post()
  @RequirePermission('activities:create')
  create(@CurrentUser() actor: AuthUser, @Body(new ZodBody(activitySchema)) dto: ActivityInput) {
    return this.activities.create(actor, dto);
  }

  /** Mobile quick-log photo → returns a photoKey to attach to an activity. */
  @Post('photo')
  @RequirePermission('activities:create')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 15 * 1024 * 1024 } }))
  async photo(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    const key = this.storage.buildKey('activity-photos', file.originalname);
    await this.storage.put(key, file.buffer, file.mimetype);
    return { photoKey: key };
  }

  @Delete(':id')
  @RequirePermission('activities:delete')
  remove(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    return this.activities.remove(actor, id);
  }
}
