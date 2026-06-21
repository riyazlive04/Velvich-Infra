'use client';

import { Fragment, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatISTDateTime } from '@/lib/format';
import { PageHeader } from '@/components/app-shell';
import { Badge, Card, EmptyState, Spinner } from '@/components/ui';

interface AuditEntry {
  id: string;
  actorId: string;
  action: string;
  entity: string;
  entityId: string | null;
  before: unknown;
  after: unknown;
  createdAt: string;
}

interface AuditResponse {
  entries: AuditEntry[];
}

const ENTITY_OPTIONS = [
  'All',
  'User',
  'Client',
  'Project',
  'Transaction',
  'Document',
  'Receivable',
  'Staff',
  'Activity',
  'Organization',
];

type BadgeColor = 'slate' | 'green' | 'amber' | 'red' | 'blue';

function actionColor(action: string): BadgeColor {
  if (action === 'PERMISSION_CHANGE') return 'red';
  if (action === 'DELETE') return 'amber';
  if (action === 'CREATE') return 'green';
  if (action === 'UPDATE') return 'blue';
  if (action === 'LOGIN' || action === 'DOWNLOAD') return 'slate';
  return 'slate';
}

function truncate(value: string | null): string {
  if (!value) return '—';
  return value.length > 12 ? `${value.slice(0, 12)}…` : value;
}

export default function AuditPage() {
  const [entity, setEntity] = useState('All');
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['audit', entity],
    queryFn: () => {
      const query = entity === 'All' ? '' : `entity=${encodeURIComponent(entity)}&`;
      return api.get<AuditResponse>(`/audit?${query}take=100`);
    },
  });

  const entries = data?.entries ?? [];

  return (
    <div>
      <PageHeader title="Audit Log" subtitle="Every change recorded for accountability" />

      <div className="mb-4 max-w-xs">
        <select
          className="input"
          value={entity}
          onChange={(e) => setEntity(e.target.value)}
        >
          {ENTITY_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <Spinner />
      ) : entries.length === 0 ? (
        <EmptyState title="No audit entries" hint="Activity will appear here as changes are made." />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Time</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Entity</th>
                <th className="px-4 py-3 font-medium">Entity ID</th>
                <th className="px-4 py-3 font-medium">Actor ID</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {entries.map((entry) => {
                const isOpen = expanded === entry.id;
                return (
                  <Fragment key={entry.id}>
                    <tr className="align-top">
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                        {formatISTDateTime(entry.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge color={actionColor(entry.action)}>{entry.action}</Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{entry.entity}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500" title={entry.entityId ?? ''}>
                        {truncate(entry.entityId)}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500" title={entry.actorId}>
                        {truncate(entry.actorId)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          className="btn-ghost text-xs"
                          onClick={() => setExpanded(isOpen ? null : entry.id)}
                        >
                          {isOpen ? 'Hide' : 'Details'}
                        </button>
                      </td>
                    </tr>
                    {isOpen ? (
                      <tr>
                        <td colSpan={6} className="bg-slate-50 px-4 py-3">
                          <div className="grid gap-4 lg:grid-cols-2">
                            <div>
                              <p className="mb-1 text-xs font-medium uppercase text-slate-500">Before</p>
                              <pre className="overflow-x-auto rounded-lg bg-white p-3 text-xs text-slate-700">
                                {JSON.stringify(entry.before, null, 2)}
                              </pre>
                            </div>
                            <div>
                              <p className="mb-1 text-xs font-medium uppercase text-slate-500">After</p>
                              <pre className="overflow-x-auto rounded-lg bg-white p-3 text-xs text-slate-700">
                                {JSON.stringify(entry.after, null, 2)}
                              </pre>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
