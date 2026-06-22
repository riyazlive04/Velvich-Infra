import { z } from 'zod';
import { ALL_CAPABILITIES } from './permissions.js';
import { PAID_VIA, PROJECT_STAGES, TXN_STATUSES, TXN_TYPES } from './enums.js';

/**
 * Shared Zod schemas - validate the SAME shape on client (RHF resolver) and
 * server (DTO). Money fields are integer paise. Dates are ISO strings.
 */

const cuid = z.string().min(1);
const paise = z.number().int().nonnegative();
const isoDate = z.string().datetime({ offset: true }).or(z.string().date());

// --- Auth -------------------------------------------------------------------
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const onboardingSchema = z.object({
  org: z.object({
    name: z.string().min(2),
    address: z.string().optional(),
    gstin: z.string().optional(),
    pan: z.string().optional(),
  }),
  owner: z.object({
    name: z.string().min(2),
    email: z.string().email(),
    phone: z.string().optional(),
    password: z.string().min(8, 'Use at least 8 characters'),
  }),
});
export type OnboardingInput = z.infer<typeof onboardingSchema>;

// --- Users / permissions ----------------------------------------------------
export const inviteUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  role: z.enum(['MANAGER', 'ACCOUNTS', 'FIELD', 'VIEWER', 'OWNER']),
});
export type InviteUserInput = z.infer<typeof inviteUserSchema>;

export const permissionOverrideSchema = z.object({
  permission: z.enum(ALL_CAPABILITIES as [string, ...string[]]),
  effect: z.enum(['ALLOW', 'DENY']),
});

export const updatePermissionsSchema = z.object({
  // null effect clears the override (back to inherited)
  changes: z.array(
    z.object({
      permission: z.enum(ALL_CAPABILITIES as [string, ...string[]]),
      effect: z.enum(['ALLOW', 'DENY']).nullable(),
    }),
  ),
});
export type UpdatePermissionsInput = z.infer<typeof updatePermissionsSchema>;

// --- Clients ----------------------------------------------------------------
export const clientContactSchema = z.object({
  name: z.string().min(1),
  role: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  notes: z.string().optional(),
});

export const clientSchema = z.object({
  name: z.string().min(2),
  deptType: z.string().min(1),
  city: z.string().optional(),
  contacts: z.array(clientContactSchema).default([]),
});
export type ClientInput = z.infer<typeof clientSchema>;

// --- Staff ------------------------------------------------------------------
export const staffSchema = z.object({
  name: z.string().min(2),
  role: z.string().min(1),
  phone: z.string().optional(),
  skills: z.string().optional(),
});
export type StaffInput = z.infer<typeof staffSchema>;

// --- Projects ---------------------------------------------------------------
export const milestoneSchema = z.object({
  label: z.string().min(1),
  expectedAmount: paise.optional(),
  dueDate: isoDate.optional(),
});

export const projectSchema = z.object({
  // Only name + type are required - everything else optional (spec §6.5).
  name: z.string().min(2),
  type: z.string().min(1),
  deptType: z.string().optional(),
  district: z.string().optional(),
  clientId: cuid.optional(),
  contractAmount: paise.optional(),
  stage: z.enum(PROJECT_STAGES).default('ENQUIRY'),
  startDate: isoDate.optional(),
  workOrderNo: z.string().optional(),
  sanctionRef: z.string().optional(),
  expectedCompletion: isoDate.optional(),
  notes: z.string().optional(),
  milestones: z.array(milestoneSchema).default([]),
  staffIds: z.array(cuid).default([]),
});
export type ProjectInput = z.infer<typeof projectSchema>;

export const stageChangeSchema = z.object({
  stage: z.enum(PROJECT_STAGES),
  note: z.string().optional(),
});
export type StageChangeInput = z.infer<typeof stageChangeSchema>;

// --- Transactions -----------------------------------------------------------
export const transactionSchema = z
  .object({
    type: z.enum(TXN_TYPES),
    category: z.string().min(1),
    description: z.string().optional(),
    amount: paise.refine((v) => v > 0, 'Amount must be greater than zero'),
    date: isoDate,
    projectId: cuid.optional(),
    incomeStatus: z.enum(TXN_STATUSES).optional(),
    paidVia: z.enum(PAID_VIA).optional(),
    reference: z.string().optional(),
    taxableValue: paise.optional(),
    gstPercent: z.number().int().min(0).max(28).optional(),
    tdsAmount: paise.optional(),
    receiptKey: z.string().optional(),
  })
  .refine((t) => t.type !== 'INCOME' || t.incomeStatus !== undefined, {
    message: 'Income status is required for income',
    path: ['incomeStatus'],
  });
export type TransactionInput = z.infer<typeof transactionSchema>;

// --- Receivables ------------------------------------------------------------
export const receivableSchema = z.object({
  projectId: cuid,
  expectedAmount: paise,
  dueDate: isoDate.optional(),
});
export type ReceivableInput = z.infer<typeof receivableSchema>;

export const followUpSchema = z.object({
  outcome: z.string().optional(),
});

// --- Activities -------------------------------------------------------------
export const activitySchema = z.object({
  type: z.string().min(1),
  date: isoDate,
  notes: z.string().optional(),
  projectId: cuid.optional(),
  staffId: cuid.optional(),
  photoKey: z.string().optional(),
});
export type ActivityInput = z.infer<typeof activitySchema>;

// --- Documents --------------------------------------------------------------
export const documentMetaSchema = z.object({
  projectId: cuid,
  category: z.string().optional(),
});
