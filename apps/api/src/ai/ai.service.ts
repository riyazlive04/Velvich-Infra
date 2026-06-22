import Anthropic from '@anthropic-ai/sdk';
import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import {
  type AiContext,
  type QuickEntryDraft,
  type ReceiptDraft,
  receiptDraftSchema,
  rupeesToPaise,
} from '@velvich/shared';
import { loadEnv } from '../config/env';

/**
 * Provider-agnostic AI assist. Every method returns an EDITABLE DRAFT - never a
 * committed record. Model, temperature and token limits are configured in ONE
 * place (env). When AI is disabled or unconfigured, callers fall back to the
 * manual form (isEnabled() === false).
 *
 * The model never sees other users' data - only the minimal AiContext passed in.
 */
@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly env = loadEnv();
  private readonly client: Anthropic | null;

  constructor() {
    this.client =
      this.env.AI_ENABLED && this.env.ANTHROPIC_API_KEY
        ? new Anthropic({ apiKey: this.env.ANTHROPIC_API_KEY })
        : null;
  }

  isEnabled(): boolean {
    return this.client !== null;
  }

  /** Vision extraction of a receipt/bill image or PDF into a draft transaction. */
  async extractReceipt(file: Buffer, mime: string, ctx: AiContext): Promise<ReceiptDraft> {
    this.assertEnabled();
    const supported = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
    if (!supported.includes(mime)) {
      // PDFs / unsupported types: return a low-confidence empty draft to edit.
      return this.emptyDraft(ctx, 'Unsupported file type for vision - please enter manually.');
    }

    const message = await this.client!.messages.create({
      model: this.env.AI_MODEL,
      max_tokens: this.env.AI_MAX_TOKENS,
      temperature: this.env.AI_TEMPERATURE,
      system: this.systemPrompt(ctx),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mime as 'image/png', data: file.toString('base64') },
            },
            { type: 'text', text: this.extractionInstruction(ctx) },
          ],
        },
      ],
    });

    return this.parseDraft(message, ctx);
  }

  /** Parse a natural-language line ("₹4,500 diesel for Rasipuram yesterday"). */
  async parseQuickEntry(text: string, ctx: AiContext): Promise<QuickEntryDraft> {
    this.assertEnabled();
    const message = await this.client!.messages.create({
      model: this.env.AI_MODEL,
      max_tokens: this.env.AI_MAX_TOKENS,
      temperature: this.env.AI_TEMPERATURE,
      system: this.systemPrompt(ctx),
      messages: [{ role: 'user', content: `${this.extractionInstruction(ctx)}\n\nText: "${text}"` }],
    });
    return this.parseDraft(message, ctx, text);
  }

  // --- prompt + parsing -----------------------------------------------------

  private systemPrompt(ctx: AiContext): string {
    return [
      'You extract Indian accounting transactions from receipts or short text.',
      `Today is ${ctx.today} (IST). All amounts are Indian Rupees.`,
      'Respond with ONLY a JSON object, no prose, no markdown fences.',
      'Shape: { "type": "INCOME"|"EXPENSE", "amountRupees": number, "date": "YYYY-MM-DD",',
      '"vendor": string|null, "suggestedCategory": string|null, "suggestedProjectId": string|null,',
      '"confidence": number between 0 and 1 }.',
      `Income categories: ${ctx.incomeCategories.join(', ')}.`,
      `Expense categories: ${ctx.expenseCategories.join(', ')}.`,
      `Known projects (id - name): ${ctx.projects.map((p) => `${p.id} - ${p.name}`).join('; ') || 'none'}.`,
      'Pick suggestedProjectId only when the text clearly names a known project; otherwise null.',
      'If unsure about a field, use null and lower the confidence.',
    ].join('\n');
  }

  private extractionInstruction(ctx: AiContext): string {
    return `Extract one transaction. Default date to ${ctx.today} if none is stated. Most bills are EXPENSE unless clearly a payment received.`;
  }

  private parseDraft(message: Anthropic.Message, ctx: AiContext, rawText?: string): ReceiptDraft {
    const textBlock = message.content.find((b) => b.type === 'text');
    const raw = textBlock && textBlock.type === 'text' ? textBlock.text : '';
    try {
      const json = JSON.parse(this.stripFences(raw)) as {
        type?: string;
        amountRupees?: number;
        date?: string;
        vendor?: string | null;
        suggestedCategory?: string | null;
        suggestedProjectId?: string | null;
        confidence?: number;
      };
      const draft: ReceiptDraft = {
        type: json.type === 'INCOME' ? 'INCOME' : 'EXPENSE',
        amount: json.amountRupees ? rupeesToPaise(json.amountRupees) : 0,
        date: json.date ?? ctx.today,
        vendor: json.vendor ?? undefined,
        suggestedCategory: json.suggestedCategory ?? undefined,
        suggestedProjectId:
          json.suggestedProjectId && ctx.projects.some((p) => p.id === json.suggestedProjectId)
            ? json.suggestedProjectId
            : undefined,
        rawText: rawText ?? raw,
        confidence: typeof json.confidence === 'number' ? Math.max(0, Math.min(1, json.confidence)) : 0.4,
      };
      return receiptDraftSchema.parse(draft);
    } catch (err) {
      this.logger.warn(`AI draft parse failed: ${(err as Error).message}`);
      return this.emptyDraft(ctx, rawText ?? raw);
    }
  }

  private emptyDraft(ctx: AiContext, rawText: string): ReceiptDraft {
    return {
      type: 'EXPENSE',
      amount: 0,
      date: ctx.today,
      rawText,
      confidence: 0,
    };
  }

  private stripFences(s: string): string {
    return s
      .trim()
      .replace(/^```(?:json)?/i, '')
      .replace(/```$/i, '')
      .trim();
  }

  private assertEnabled(): void {
    if (!this.client) {
      throw new ServiceUnavailableException('AI assist is disabled - use the manual form');
    }
  }
}
