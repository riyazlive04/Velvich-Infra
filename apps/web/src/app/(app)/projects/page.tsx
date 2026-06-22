'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LayoutGrid, List, Plus } from 'lucide-react';
import {
  PROJECT_STAGES,
  PROJECT_STAGE_LABELS,
  type ProjectStage,
} from '@velvich/shared';
import { api } from '@/lib/api';
import { useMe } from '@/lib/session';
import { formatINR, rupeesToPaise } from '@/lib/format';
import { PageHeader, Can } from '@/components/app-shell';
import { Badge, Button, Card, EmptyState, Field, Input, Modal, Spinner } from '@/components/ui';

interface BoardCard {
  id: string;
  name: string;
  type: string;
  clientName: string | null;
  contractAmount: number | null;
  collectionPercent: number | null;
}
interface Board {
  columns: Array<{ stage: ProjectStage; projects: BoardCard[] }>;
}
interface ClientMini {
  id: string;
  name: string;
}

export default function ProjectsPage() {
  const qc = useQueryClient();
  const [view, setView] = useState<'board' | 'list'>('board');
  const [createOpen, setCreateOpen] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);

  const { data: board, isLoading } = useQuery({
    queryKey: ['board'],
    queryFn: () => api.get<Board>('/projects/board'),
  });

  const changeStage = useMutation({
    mutationFn: (v: { id: string; stage: ProjectStage }) => api.patch(`/projects/${v.id}/stage`, { stage: v.stage }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['board'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  function onDrop(stage: ProjectStage) {
    if (dragId) changeStage.mutate({ id: dragId, stage });
    setDragId(null);
  }

  return (
    <div>
      <PageHeader
        title="Projects & Pipeline"
        subtitle="Drag a card between stages to update it"
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setView(view === 'board' ? 'list' : 'board')}>
              {view === 'board' ? <List className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
              {view === 'board' ? 'List' : 'Board'}
            </Button>
            <Can cap="projects:create">
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" /> New project
              </Button>
            </Can>
          </div>
        }
      />

      {isLoading || !board ? (
        <Spinner />
      ) : view === 'board' ? (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {board.columns.map((col) => (
            <div
              key={col.stage}
              className="w-64 shrink-0 rounded-xl bg-slate-100 p-2"
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(col.stage)}
            >
              <div className="mb-2 flex items-center justify-between px-1">
                <p className="text-sm font-semibold text-slate-700">{PROJECT_STAGE_LABELS[col.stage]}</p>
                <span className="text-xs text-slate-400">{col.projects.length}</span>
              </div>
              <div className="space-y-2">
                {col.projects.map((p) => (
                  <div
                    key={p.id}
                    draggable
                    onDragStart={() => setDragId(p.id)}
                    className="card cursor-grab p-3 active:cursor-grabbing"
                  >
                    <p className="text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-slate-500">
                      {p.type}
                      {p.clientName ? ` · ${p.clientName}` : ''}
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      {p.contractAmount ? (
                        <span className="text-xs text-slate-600">{formatINR(p.contractAmount, { compact: true })}</span>
                      ) : (
                        <span className="text-xs text-slate-400">No contract</span>
                      )}
                      {p.collectionPercent !== null ? <Badge color="green">{p.collectionPercent}%</Badge> : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <ListView board={board} />
      )}

      {createOpen ? <CreateProjectModal onClose={() => setCreateOpen(false)} /> : null}
    </div>
  );
}

function ListView({ board }: { board: Board }) {
  const all = board.columns.flatMap((c) => c.projects.map((p) => ({ ...p, stage: c.stage })));
  if (all.length === 0) return <EmptyState title="No projects yet" hint="Create your first project." />;
  return (
    <Card className="p-0">
      <ul className="divide-y divide-slate-100">
        {all.map((p) => (
          <li key={p.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="font-medium">{p.name}</p>
              <p className="text-xs text-slate-500">
                {p.type}
                {p.clientName ? ` · ${p.clientName}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge>{PROJECT_STAGE_LABELS[p.stage]}</Badge>
              {p.contractAmount ? <span className="text-sm">{formatINR(p.contractAmount, { compact: true })}</span> : null}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function CreateProjectModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const me = useMe();
  const projectTypes = me?.organization?.settings?.projectTypes ?? [];
  const deptTypes = me?.organization?.settings?.deptTypes ?? [];

  const [form, setForm] = useState({
    name: '',
    type: '',
    deptType: '',
    district: '',
    clientId: '',
    contractAmount: '',
    stage: 'ENQUIRY' as ProjectStage,
    startDate: '',
    notes: '',
  });
  const [error, setError] = useState('');
  const [showInlineClient, setShowInlineClient] = useState(false);

  const { data: clients } = useQuery({
    queryKey: ['clients-mini'],
    queryFn: () => api.get<ClientMini[]>('/clients'),
    retry: false,
  });

  const create = useMutation({
    mutationFn: () =>
      api.post('/projects', {
        name: form.name,
        type: form.type,
        deptType: form.deptType || undefined,
        district: form.district || undefined,
        clientId: form.clientId || undefined,
        contractAmount: form.contractAmount ? rupeesToPaise(form.contractAmount) : undefined,
        stage: form.stage,
        startDate: form.startDate ? new Date(form.startDate).toISOString() : undefined,
        notes: form.notes || undefined,
        milestones: [],
        staffIds: [],
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['board'] });
      onClose();
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Failed'),
  });

  return (
    <Modal open onClose={onClose} title="New project" wide>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          setError('');
          if (!form.name || !form.type) {
            setError('Name and type are required');
            return;
          }
          create.mutate();
        }}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Name *">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </Field>
          <Field label="Type *">
            <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} required>
              <option value="">Select type…</option>
              {projectTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Department">
            <select className="input" value={form.deptType} onChange={(e) => setForm({ ...form, deptType: e.target.value })}>
              <option value="">-</option>
              {deptTypes.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </Field>
          <Field label="District">
            <Input value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} />
          </Field>
          <Field label="Client">
            <div className="flex gap-2">
              <select className="input" value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })}>
                <option value="">No client</option>
                {clients?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <Can cap="clients:manage">
                <Button type="button" variant="secondary" onClick={() => setShowInlineClient((s) => !s)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </Can>
            </div>
          </Field>
          <Field label="Contract amount (₹)">
            <Input
              type="number"
              step="0.01"
              value={form.contractAmount}
              onChange={(e) => setForm({ ...form, contractAmount: e.target.value })}
            />
          </Field>
          <Field label="Stage">
            <select className="input" value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value as ProjectStage })}>
              {PROJECT_STAGES.map((s) => (
                <option key={s} value={s}>
                  {PROJECT_STAGE_LABELS[s]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Start date">
            <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
          </Field>
        </div>

        {showInlineClient ? (
          <InlineClientCreate
            onCreated={(id) => {
              setForm((f) => ({ ...f, clientId: id }));
              setShowInlineClient(false);
              qc.invalidateQueries({ queryKey: ['clients-mini'] });
            }}
          />
        ) : null}

        <Field label="Notes">
          <textarea className="input min-h-[70px]" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </Field>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <Button type="submit" className="w-full" disabled={create.isPending}>
          {create.isPending ? 'Creating…' : 'Create project'}
        </Button>
      </form>
    </Modal>
  );
}

/** Inline client creation from inside the project form (spec AC §8.3). */
function InlineClientCreate({ onCreated }: { onCreated: (id: string) => void }) {
  const me = useMe();
  const deptTypes = me?.organization?.settings?.deptTypes ?? [];
  const [name, setName] = useState('');
  const [deptType, setDeptType] = useState(deptTypes[0] ?? 'PWD');

  const create = useMutation({
    mutationFn: () => api.post<{ id: string }>('/clients', { name, deptType, contacts: [] }),
    onSuccess: (res) => onCreated(res.id),
  });

  return (
    <div className="rounded-lg border border-brand-100 bg-brand-50 p-3">
      <p className="mb-2 text-sm font-medium text-brand-700">Quick add client</p>
      <div className="flex flex-wrap gap-2">
        <Input className="max-w-[200px]" placeholder="Client name" value={name} onChange={(e) => setName(e.target.value)} />
        <select className="input max-w-[160px]" value={deptType} onChange={(e) => setDeptType(e.target.value)}>
          {deptTypes.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <Button type="button" disabled={!name || create.isPending} onClick={() => create.mutate()}>
          Add
        </Button>
      </div>
    </div>
  );
}
