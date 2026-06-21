import { z } from 'zod';

/**
 * AI assist contracts. Every AI method returns an EDITABLE DRAFT — never a
 * committed record. The caller renders a confirmation card with every field
 * editable; persistence is a separate, explicit user action.
 */

export const receiptDraftSchema = z.object({
  type: z.enum(['INCOME', 'EXPENSE']),
  amount: z.number().int().nonnegative(), // paise
  date: z.string(), // ISO date
  vendor: z.string().optional(),
  suggestedCategory: z.string().optional(),
  suggestedProjectId: z.string().optional(),
  rawText: z.string(),
  confidence: z.number().min(0).max(1),
});
export type ReceiptDraft = z.infer<typeof receiptDraftSchema>;

export const quickEntryDraftSchema = receiptDraftSchema;
export type QuickEntryDraft = z.infer<typeof quickEntryDraftSchema>;

/** Minimal, least-privilege context handed to the model (no other users' data). */
export interface AiContext {
  today: string; // ISO date in IST
  projects: Array<{ id: string; name: string }>;
  incomeCategories: string[];
  expenseCategories: string[];
}

/** Threshold below which a draft is flagged "low confidence" in the UI. */
export const LOW_CONFIDENCE_THRESHOLD = 0.6;
