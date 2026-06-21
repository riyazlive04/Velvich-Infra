import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { transactionSchema, type TransactionInput } from '@velvich/shared';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth-user';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequirePermission } from '../permissions/require-permission.decorator';
import { ZodBody } from '../common/zod-validation.pipe';
import { AiService } from '../ai/ai.service';
import { StorageService } from '../storage/storage.service';
import { loadEnv } from '../config/env';
import { TransactionsService } from './transactions.service';

const env = loadEnv();

@Controller('transactions')
@UseGuards(PermissionsGuard)
export class TransactionsController {
  constructor(
    private readonly transactions: TransactionsService,
    private readonly ai: AiService,
    private readonly storage: StorageService,
  ) {}

  @Get()
  @RequirePermission('transactions:view')
  list(
    @Query('type') type?: 'INCOME' | 'EXPENSE',
    @Query('projectId') projectId?: string,
    @Query('month') month?: string,
  ) {
    return this.transactions.list({ type, projectId, month });
  }

  @Post()
  @RequirePermission('transactions:create')
  create(
    @CurrentUser() actor: AuthUser,
    @Body(new ZodBody(transactionSchema)) dto: TransactionInput,
    @Query('source') source?: string,
  ) {
    // source defaults to 'manual'; AI confirms pass 'receipt_ai' | 'nl_ai'.
    const allowed = ['manual', 'receipt_ai', 'nl_ai', 'import', 'recurring'] as const;
    const src = allowed.includes(source as (typeof allowed)[number])
      ? (source as (typeof allowed)[number])
      : 'manual';
    return this.transactions.create(actor, dto, src);
  }

  @Put(':id')
  @RequirePermission('transactions:edit')
  update(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body(new ZodBody(transactionSchema)) dto: TransactionInput,
  ) {
    return this.transactions.update(actor, id, dto);
  }

  @Delete(':id')
  @RequirePermission('transactions:delete')
  remove(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    return this.transactions.remove(actor, id);
  }

  // --- AI assist: returns DRAFTS only. Nothing is persisted here. -----------

  /** NL quick-add → editable draft. The user confirms via POST /transactions. */
  @Post('ai/quick-entry')
  @RequirePermission('transactions:create')
  async quickEntry(@Body('text') text: string) {
    if (!text || text.trim().length < 2) throw new BadRequestException('Provide some text');
    if (!this.ai.isEnabled()) {
      return { enabled: false, draft: null };
    }
    const ctx = await this.transactions.buildAiContext();
    const draft = await this.ai.parseQuickEntry(text, ctx);
    return { enabled: true, draft };
  }

  /**
   * Receipt capture → store the original on R2, return an editable draft with
   * the receiptKey. On confirm the client posts the transaction with that key.
   */
  @Post('ai/receipt')
  @RequirePermission('transactions:create')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: env.MAX_UPLOAD_MB * 1024 * 1024 } }))
  async receipt(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');

    let receiptKey: string | undefined;
    if (this.storage.isConfigured()) {
      receiptKey = this.storage.buildKey('receipts', file.originalname);
      await this.storage.put(receiptKey, file.buffer, file.mimetype);
    }

    if (!this.ai.isEnabled()) {
      return { enabled: false, draft: null, receiptKey };
    }
    const ctx = await this.transactions.buildAiContext();
    const draft = await this.ai.extractReceipt(file.buffer, file.mimetype, ctx);
    return { enabled: true, draft: { ...draft, receiptKey }, receiptKey };
  }
}
