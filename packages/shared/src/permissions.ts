/**
 * Permission model — the single source of truth shared by API (enforcement)
 * and Web (UI gating). Capabilities are `resource:action` strings.
 *
 * Resolution: effective = rolePreset ∪ ALLOW-overrides − DENY-overrides.
 * An explicit override always beats the role default. OWNER is absolute and
 * always holds every capability (see getEffectivePermissions).
 */

export const ROLES = ['OWNER', 'MANAGER', 'ACCOUNTS', 'FIELD', 'VIEWER'] as const;
export type RoleName = (typeof ROLES)[number];

export type PermissionEffect = 'ALLOW' | 'DENY';

/**
 * Capability catalogue, grouped by module. The grouping drives the Owner's
 * permission-matrix UI; the flat list (ALL_CAPABILITIES) drives validation.
 */
export const CAPABILITY_GROUPS = [
  {
    module: 'dashboard',
    label: 'Dashboard',
    capabilities: [{ key: 'dashboard:view', label: 'View dashboard' }],
  },
  {
    module: 'projects',
    label: 'Projects & Pipeline',
    capabilities: [
      { key: 'projects:view', label: 'View projects' },
      { key: 'projects:create', label: 'Create projects' },
      { key: 'projects:edit', label: 'Edit projects & stage' },
      { key: 'projects:delete', label: 'Delete projects' },
      { key: 'pipeline:view', label: 'View pipeline / Kanban' },
    ],
  },
  {
    module: 'clients',
    label: 'Clients & Contacts',
    capabilities: [
      { key: 'clients:view', label: 'View clients' },
      { key: 'clients:manage', label: 'Create / edit / delete clients' },
    ],
  },
  {
    module: 'staff',
    label: 'Staff',
    capabilities: [
      { key: 'staff:view', label: 'View staff' },
      { key: 'staff:manage', label: 'Create / edit / assign staff' },
    ],
  },
  {
    module: 'transactions',
    label: 'Transactions',
    capabilities: [
      { key: 'transactions:view', label: 'View transactions' },
      { key: 'transactions:create', label: 'Create transactions' },
      { key: 'transactions:edit', label: 'Edit transactions' },
      { key: 'transactions:delete', label: 'Delete transactions' },
    ],
  },
  {
    module: 'accounts',
    label: 'Project Accounts',
    capabilities: [
      { key: 'accounts:view', label: 'View project P&L' },
      { key: 'ledger:view', label: 'View monthly ledger' },
    ],
  },
  {
    module: 'receivables',
    label: 'Receivables',
    capabilities: [
      { key: 'receivables:view', label: 'View receivables' },
      { key: 'receivables:manage', label: 'Manage receivables & follow-ups' },
    ],
  },
  {
    module: 'activities',
    label: 'Activity Log',
    capabilities: [
      { key: 'activities:view', label: 'View activities' },
      { key: 'activities:create', label: 'Log activities' },
      { key: 'activities:delete', label: 'Delete activities' },
    ],
  },
  {
    module: 'documents',
    label: 'Documents',
    capabilities: [
      { key: 'documents:view', label: 'View / download documents' },
      { key: 'documents:upload', label: 'Upload documents' },
      { key: 'documents:delete', label: 'Delete documents' },
    ],
  },
  {
    module: 'reports',
    label: 'Reports',
    capabilities: [
      { key: 'reports:view', label: 'View reports' },
      { key: 'reports:export', label: 'Export reports (Excel/PDF)' },
    ],
  },
  {
    module: 'tenders',
    label: 'Tenders (Phase 2)',
    capabilities: [
      { key: 'tenders:view', label: 'View tenders' },
      { key: 'tenders:manage', label: 'Manage tenders' },
    ],
  },
  {
    module: 'admin',
    label: 'Administration',
    capabilities: [
      { key: 'users:manage', label: 'Manage users' },
      { key: 'permissions:manage', label: 'Manage permissions' },
      { key: 'settings:manage', label: 'Manage settings' },
      { key: 'audit:view', label: 'View audit log' },
    ],
  },
] as const;

export type Capability =
  (typeof CAPABILITY_GROUPS)[number]['capabilities'][number]['key'];

/** Flat, deduplicated list of every capability string. */
export const ALL_CAPABILITIES: Capability[] = CAPABILITY_GROUPS.flatMap((g) =>
  g.capabilities.map((c) => c.key),
);

const ALL_CAPABILITY_SET = new Set<string>(ALL_CAPABILITIES);

export function isCapability(value: string): value is Capability {
  return ALL_CAPABILITY_SET.has(value);
}

/**
 * Role presets — defaults only. The Owner can override any capability per user.
 * OWNER is intentionally NOT enumerated here: it is granted the full set
 * implicitly and can never be reduced (see getEffectivePermissions).
 */
export const ROLE_PRESETS: Record<Exclude<RoleName, 'OWNER'>, Capability[]> = {
  MANAGER: ALL_CAPABILITIES.filter(
    (c) => !['users:manage', 'permissions:manage', 'settings:manage', 'audit:view'].includes(c),
  ),
  ACCOUNTS: [
    'dashboard:view',
    'projects:view',
    'pipeline:view',
    'clients:view',
    'transactions:view',
    'transactions:create',
    'transactions:edit',
    'transactions:delete',
    'accounts:view',
    'ledger:view',
    'receivables:view',
    'receivables:manage',
    'documents:view',
    'documents:upload',
    'reports:view',
    'reports:export',
  ],
  FIELD: [
    'dashboard:view',
    'projects:view',
    'projects:edit',
    'pipeline:view',
    'activities:view',
    'activities:create',
    'documents:view',
    'documents:upload',
  ],
  VIEWER: ALL_CAPABILITIES.filter((c) => c.endsWith(':view')),
};

/** The role preset for any role. OWNER returns the full capability set. */
export function getRolePreset(role: RoleName): Capability[] {
  if (role === 'OWNER') return [...ALL_CAPABILITIES];
  return [...ROLE_PRESETS[role]];
}

export interface PermissionOverride {
  permission: string;
  effect: PermissionEffect;
}

export interface PermissionSubject {
  role: RoleName;
  overrides: PermissionOverride[];
}

/**
 * Compute the effective capability set for a user.
 * OWNER is absolute: always the full set, overrides ignored (cannot be locked out).
 */
export function getEffectivePermissions(subject: PermissionSubject): Set<Capability> {
  if (subject.role === 'OWNER') {
    return new Set(ALL_CAPABILITIES);
  }

  const effective = new Set<Capability>(getRolePreset(subject.role));

  for (const override of subject.overrides) {
    if (!isCapability(override.permission)) continue; // ignore stale/unknown caps
    if (override.effect === 'ALLOW') {
      effective.add(override.permission);
    } else {
      effective.delete(override.permission);
    }
  }

  return effective;
}

export function can(subject: PermissionSubject, capability: Capability): boolean {
  return getEffectivePermissions(subject).has(capability);
}

/**
 * Tri-state used by the Owner's matrix UI for a single capability.
 *  - 'inherited-allow' / 'inherited-deny': comes from the role preset, no override
 *  - 'allow' / 'deny': an explicit override is in place
 */
export type MatrixState = 'inherited-allow' | 'inherited-deny' | 'allow' | 'deny';

export function getMatrixState(subject: PermissionSubject, capability: Capability): MatrixState {
  const override = subject.overrides.find((o) => o.permission === capability);
  if (override) return override.effect === 'ALLOW' ? 'allow' : 'deny';
  const inherited = getRolePreset(subject.role).includes(capability);
  return inherited ? 'inherited-allow' : 'inherited-deny';
}
