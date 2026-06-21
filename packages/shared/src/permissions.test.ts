import { describe, expect, it } from 'vitest';
import {
  ALL_CAPABILITIES,
  can,
  getEffectivePermissions,
  getMatrixState,
  getRolePreset,
} from './permissions.js';

describe('permission resolution', () => {
  it('OWNER always has every capability regardless of overrides', () => {
    const eff = getEffectivePermissions({
      role: 'OWNER',
      overrides: [
        { permission: 'transactions:create', effect: 'DENY' },
        { permission: 'users:manage', effect: 'DENY' },
      ],
    });
    expect(eff.size).toBe(ALL_CAPABILITIES.length);
    for (const cap of ALL_CAPABILITIES) expect(eff.has(cap)).toBe(true);
  });

  it('VIEWER preset is view-only', () => {
    const preset = getRolePreset('VIEWER');
    expect(preset.every((c) => c.endsWith(':view'))).toBe(true);
    expect(preset).not.toContain('transactions:create');
  });

  it('ALLOW override grants a capability beyond the role preset', () => {
    expect(can({ role: 'VIEWER', overrides: [] }, 'transactions:create')).toBe(false);
    expect(
      can(
        { role: 'VIEWER', overrides: [{ permission: 'transactions:create', effect: 'ALLOW' }] },
        'transactions:create',
      ),
    ).toBe(true);
  });

  it('DENY override removes a capability from the role preset', () => {
    expect(can({ role: 'ACCOUNTS', overrides: [] }, 'transactions:delete')).toBe(true);
    expect(
      can(
        { role: 'ACCOUNTS', overrides: [{ permission: 'transactions:delete', effect: 'DENY' }] },
        'transactions:delete',
      ),
    ).toBe(false);
  });

  it('explicit override beats the role default (DENY then ALLOW resolves last write via array order)', () => {
    // MANAGER lacks users:manage by default; an explicit ALLOW grants it.
    expect(
      can(
        { role: 'MANAGER', overrides: [{ permission: 'users:manage', effect: 'ALLOW' }] },
        'users:manage',
      ),
    ).toBe(true);
  });

  it('MANAGER lacks the four admin capabilities by default', () => {
    const m = { role: 'MANAGER' as const, overrides: [] };
    expect(can(m, 'users:manage')).toBe(false);
    expect(can(m, 'permissions:manage')).toBe(false);
    expect(can(m, 'settings:manage')).toBe(false);
    expect(can(m, 'audit:view')).toBe(false);
    expect(can(m, 'transactions:create')).toBe(true);
  });

  it('matrix state distinguishes inherited from explicit', () => {
    expect(getMatrixState({ role: 'VIEWER', overrides: [] }, 'dashboard:view')).toBe(
      'inherited-allow',
    );
    expect(getMatrixState({ role: 'VIEWER', overrides: [] }, 'transactions:create')).toBe(
      'inherited-deny',
    );
    expect(
      getMatrixState(
        { role: 'VIEWER', overrides: [{ permission: 'transactions:create', effect: 'ALLOW' }] },
        'transactions:create',
      ),
    ).toBe('allow');
  });

  it('ignores stale/unknown capabilities in overrides', () => {
    const eff = getEffectivePermissions({
      role: 'VIEWER',
      overrides: [{ permission: 'nonexistent:cap', effect: 'ALLOW' }],
    });
    expect(eff.has('dashboard:view')).toBe(true);
  });
});
