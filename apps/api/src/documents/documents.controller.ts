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
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth-user';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequirePermission } from '../permissions/require-permission.decorator';
import { loadEnv } from '../config/env';
import { DocumentsService } from './documents.service';

const env = loadEnv();

@Controller('documents')
@UseGuards(PermissionsGuard)
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Get()
  @RequirePermission('documents:view')
  list(@Query('projectId') projectId: string) {
    if (!projectId) throw new BadRequestException('projectId is required');
    return this.documents.list(projectId);
  }

  @Post()
  @RequirePermission('documents:upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: env.MAX_UPLOAD_MB * 1024 * 1024 } }))
  upload(
    @CurrentUser() actor: AuthUser,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body('projectId') projectId: string,
    @Body('category') category?: string,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    if (!projectId) throw new BadRequestException('projectId is required');
    return this.documents.upload(actor, file, { projectId, category });
  }

  /** Permission-checked signed URL - the only way to reach a private object. */
  @Get(':id/download')
  @RequirePermission('documents:view')
  download(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    return this.documents.getDownloadUrl(actor, id);
  }

  @Delete(':id')
  @RequirePermission('documents:delete')
  remove(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    return this.documents.remove(actor, id);
  }
}
