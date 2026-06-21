'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, KeyRound } from 'lucide-react';
import {
  CAPABILITY_GROUPS,
  getRolePreset,
  type Capability,
  type MatrixState,
  type RoleName,
} from '@velvich/shared';
import { api } from '@/lib/api';
import { formatISTDate } from '@/lib/format';
import { PageHeader, Can } from '@/components/app-shell';
import { Badge, Button, Card, EmptyState, Field, Input, Modal, Spinner } from '@/components/ui';

interface UserRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: RoleName;
  status: 'ACTIVE' | 'INACTIVE';
  lastLoginAt: string | null;
  createdAt: string;
}

const ROLES: RoleName[] = ['OWNER', 'MANAGER', 'ACCOUNTS', 'FIELD', 'VIEWER'];

export default function UsersPage() {
  const qc = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [permUser, setPermUser] = useState<UserRow | null>(null);

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get<UserRow[]>('/users'),
  });

  const setStatus = useMutation({
    mutationFn: (v: { id: string; status: 'ACTIVE' | 'INACTIVE' }) =>
      api.patch(`/users/${v.id}/status`, { status: v.status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
  const setRole = useMutation({
    mutationFn: (v: { id: string; role: RoleName }) => api.patch(`/users/${v.id}/role`, { role: v.role }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });

  return (
    <div>
      <PageHeader
        title="Users & Access"
        subtitle="Invite users, set roles, and control any capability per user"
        action={
          <Can cap="users:manage">
            <Button onClick={() => setInviteOpen(true)}>Invite user</Button>
          </Can>
        }
      />

      {isLoading ? (
        <Spinner />
      ) : !users || users.length === 0 ? (
        <EmptyState title="No users yet" />
      ) : (
        <Card className="p-0">
          <ul className="divide-y divide-slate-100">
            {users.map((u) => (
              <li key={u.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{u.name}</p>
                    {u.status === 'INACTIVE' ? <Badge color="red">inactive</Badge> : null}
                  </div>
                  <p className="text-xs text-slate-500">
                    {u.email}
                    {u.lastLoginAt ? ` · last login ${formatISTDate(u.lastLoginAt)}` : ' · never logged in'}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Can cap="users:manage">
                    <select
                      className="input max-w-[140px]"
                      value={u.role}
                      disabled={u.role === 'OWNER'}
                      onChange={(e) => setRole.mutate({ id: u.id, role: e.target.value as RoleName })}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </Can>
                  <Can cap="permissions:manage">
                    <Button variant="secondary" onClick={() => setPermUser(u)} disabled={u.role === 'OWNER'}>
                      <ShieldCheck className="h-4 w-4" /> Permissions
                    </Button>
                  </Can>
                  <Can cap="users:manage">
                    <Button
                      variant="ghost"
                      onClick={() =>
                        setStatus.mutate({ id: u.id, status: u.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' })
                      }
                      disabled={u.role === 'OWNER'}
                    >
                      {u.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                    </Button>
                  </Can>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {inviteOpen ? <InviteModal onClose={() => setInviteOpen(false)} /> : null}
      {permUser ? <PermissionMatrixModal user={permUser} onClose={() => setPermUser(null)} /> : null}
    </div>
  );
}

function InviteModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: '', email: '', phone: '', role: 'VIEWER' as RoleName });
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [error, setError] = useState('');

  const invite = useMutation({
    mutationFn: () => api.post<{ user: UserRow; tempPassword: string }>('/users', form),
    onSuccess: (res) => {
      setTempPassword(res.tempPassword);
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Failed'),
  });

  return (
    <Modal open onClose={onClose} title="Invite user">
      {tempPassword ? (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            User created. Share this one-time password securely — they should reset it on first login.
          </p>
          <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 font-mono text-sm">
            <KeyRound className="h-4 w-4" /> {tempPassword}
          </div>
          <Button className="w-full" onClick={onClose}>
            Done
          </Button>
        </div>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setError('');
            invite.mutate();
          }}
        >
          <Field label="Name">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </Field>
          <Field label="Email">
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </Field>
          <Field label="Phone (optional)">
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>
          <Field label="Role">
            <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as RoleName })}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </Field>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={invite.isPending}>
            {invite.isPending ? 'Creating…' : 'Create user'}
          </Button>
        </form>
      )}
    </Modal>
  );
}

// --- The permission matrix: per-capability tri-state editor ----------------
type Effect = 'ALLOW' | 'DENY' | null;

function PermissionMatrixModal({ user, onClose }: { user: UserRow; onClose: () => void }) {
  const qc = useQueryClient();
  const [overrides, setOverrides] = useState<Record<string, Effect>>({});
  const [baseMatrix, setBaseMatrix] = useState<Record<string, MatrixState>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['user-permissions', user.id],
    queryFn: () => api.get<{ userId: string; role: RoleName; matrix: Record<string, MatrixState> }>(`/users/${user.id}/permissions`),
  });

  useEffect(() => {
    if (data) setBaseMatrix(data.matrix);
  }, [data]);

  const rolePreset = new Set(getRolePreset(user.role));

  function currentState(cap: Capability): { effect: Effect; inheritedAllow: boolean } {
    const inheritedAllow = rolePreset.has(cap);
    if (cap in overrides) return { effect: overrides[cap] ?? null, inheritedAllow };
    const base = baseMatrix[cap];
    const effect: Effect = base === 'allow' ? 'ALLOW' : base === 'deny' ? 'DENY' : null;
    return { effect, inheritedAllow };
  }

  const save = useMutation({
    mutationFn: () => {
      const changes = Object.entries(overrides).map(([permission, effect]) => ({ permission, effect }));
      return api.put(`/users/${user.id}/permissions`, { changes });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user-permissions', user.id] });
      qc.invalidateQueries({ queryKey: ['me'] });
      onClose();
    },
  });

  const dirty = Object.keys(overrides).length > 0;

  return (
    <Modal open onClose={onClose} title={`Permissions — ${user.name}`} wide>
      {isLoading ? (
        <Spinner />
      ) : (
        <div className="space-y-5">
          <p className="text-sm text-slate-500">
            Role <Badge color="blue">{user.role}</Badge> sets the defaults. Override any capability to Allow or Deny — an
            explicit override always wins. Changes apply on the user&apos;s next request.
          </p>

          {CAPABILITY_GROUPS.map((group) => (
            <div key={group.module}>
              <p className="mb-2 text-sm font-semibold text-slate-700">{group.label}</p>
              <div className="space-y-1.5">
                {group.capabilities.map((cap) => {
                  const state = currentState(cap.key);
                  return (
                    <div key={cap.key} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 px-3 py-1.5">
                      <span className="text-sm">{cap.label}</span>
                      <div className="flex gap-1">
                        <SegBtn
                          active={state.effect === null}
                          onClick={() => setOverrides((o) => ({ ...o, [cap.key]: null }))}
                          label={`Inherited (${state.inheritedAllow ? 'on' : 'off'})`}
                        />
                        <SegBtn
                          active={state.effect === 'ALLOW'}
                          tone="green"
                          onClick={() => setOverrides((o) => ({ ...o, [cap.key]: 'ALLOW' }))}
                          label="Allow"
                        />
                        <SegBtn
                          active={state.effect === 'DENY'}
                          tone="red"
                          onClick={() => setOverrides((o) => ({ ...o, [cap.key]: 'DENY' }))}
                          label="Deny"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="sticky bottom-0 flex justify-end gap-2 border-t border-slate-200 bg-white pt-3">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={() => save.mutate()} disabled={!dirty || save.isPending}>
              {save.isPending ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function SegBtn({
  active,
  onClick,
  label,
  tone,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  tone?: 'green' | 'red';
}) {
  const activeCls =
    tone === 'green' ? 'bg-green-600 text-white' : tone === 'red' ? 'bg-red-600 text-white' : 'bg-slate-700 text-white';
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-2.5 py-1 text-xs font-medium ${active ? activeCls : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
    >
      {label}
    </button>
  );
}
