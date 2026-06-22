/** Domain enums - kept in sync with the Prisma schema. */

export const PROJECT_STAGES = [
  'ENQUIRY',
  'SURVEY',
  'DPR_PREPARATION',
  'SUBMITTED',
  'APPROVED',
  'WORK_ORDER',
  'EXECUTION',
  'COMPLETED',
  'ON_HOLD',
] as const;
export type ProjectStage = (typeof PROJECT_STAGES)[number];

export const PROJECT_STAGE_LABELS: Record<ProjectStage, string> = {
  ENQUIRY: 'Enquiry',
  SURVEY: 'Survey',
  DPR_PREPARATION: 'DPR Preparation',
  SUBMITTED: 'Submitted',
  APPROVED: 'Approved',
  WORK_ORDER: 'Work Order',
  EXECUTION: 'Execution',
  COMPLETED: 'Completed',
  ON_HOLD: 'On Hold',
};

export const TXN_TYPES = ['INCOME', 'EXPENSE'] as const;
export type TxnType = (typeof TXN_TYPES)[number];

export const TXN_STATUSES = ['RECEIVED', 'PENDING'] as const;
export type TxnStatus = (typeof TXN_STATUSES)[number];

export const PAID_VIA = ['CASH', 'BANK', 'CHEQUE', 'UPI'] as const;
export type PaidVia = (typeof PAID_VIA)[number];

export const TXN_SOURCES = ['manual', 'receipt_ai', 'nl_ai', 'import', 'recurring'] as const;
export type TxnSource = (typeof TXN_SOURCES)[number];

export const USER_STATUSES = ['ACTIVE', 'INACTIVE'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

/**
 * Default editable lists seeded into Organization.settings. The Owner can edit
 * these in Settings; nothing in the app should hard-code these values beyond
 * the seed - always read from org settings at runtime.
 */
export const DEFAULT_SETTINGS = {
  projectTypes: [
    'Highway',
    'Bypass',
    'Bridge',
    'Grade Separator',
    'Ghat Road',
    'ROB/RUB/HLB',
    'Railway Bridge',
    'Plot Layout',
    'Traffic Study',
    'DGPS Survey',
    'DPR',
    'Land Survey - Agriculture',
    'Land Survey - Residential',
    'Land Survey - Hill',
    'Other',
  ],
  deptTypes: [
    'PWD',
    'TNRD',
    'Highways Dept',
    'Rural Development',
    'NHAI',
    'Municipality',
    'Private',
  ],
  incomeCategories: [
    'Mobilization Advance',
    'Interim Payment',
    'Final Payment',
    'Retention Release',
    'Survey Fee',
    'Consultancy Fee',
    'Other Income',
  ],
  expenseCategories: [
    'Salaries',
    'Field Allowance',
    'Travel & Fuel',
    'Survey Equipment',
    'Printing & Stationery',
    'Office Rent',
    'Government Fees',
    'Sub-consultant',
    'Software & Licenses',
    'Miscellaneous',
  ],
  activityTypes: [
    'Site Survey',
    'Client Meeting',
    'Govt Office Visit',
    'DPR Submission',
    'Drawing Review',
    'Payment Follow-up',
    'Call',
    'Inspection',
    'Internal Meeting',
  ],
  documentCategories: [
    'Survey Data',
    'Drawings',
    'DPR',
    'Sanction Order',
    'Correspondence',
    'Work Order',
    'Other',
  ],
  staffRoles: [
    'Survey Engineer',
    'DGPS Operator',
    'CAD Draftsman',
    'DPR Engineer',
    'Project Manager',
    'Office Staff',
  ],
  milestoneLabels: ['Mobilization Advance', 'Interim', 'Final', 'Retention Release'],
} as const;

export type OrgSettings = {
  projectTypes: string[];
  deptTypes: string[];
  incomeCategories: string[];
  expenseCategories: string[];
  activityTypes: string[];
  documentCategories: string[];
  staffRoles: string[];
  milestoneLabels: string[];
};
