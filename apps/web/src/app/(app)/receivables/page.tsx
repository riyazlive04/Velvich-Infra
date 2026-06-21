'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatINR, formatISTDate } from '@/lib/format';
import { PageHeader, Can } from '@/components/app-shell';
import { Badge, Button, Card, EmptyState, Field, Modal, Spinner } from '@/components/ui';

type Bucket = 'current' | '0-30' | '31-60' | '61-90' | '90+';

interface Receivable {
  id: string;
  project: { id: string; name: string };
  expectedAmount: number;
  dueDate: string | null;
  daysOverdue: number;
  bucket: Bucket;
  overdue: boolean;
  lastFollowUp: { id: string; outcome: string | null; contactedAt: string } | null;
}

const BUCKET_COLOR: Record<Bucket, 'slate' | 'blue' | 'amber' | 'red'> = {
  current: 'slate',
  '0-30': 'blue',
  '31-60': 'amber',
  '61-90': 'amber',
  '90+': 'red',
};

const BUCKET_LABEL: Record<Bucket, string> = {
  current: 'Current',
  '0-30': '0–30 days',
  '31-60': '31–60 days',
  '61-90': '61–90 days',
  '90+': '90+ days',
};

export default function ReceivablesPage() {
  const qc = useQueryClient();
  const [followUpFor, setFollowUpFor] = useState<Receivable | null>(null);
  const [outcome, setOutcome] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['receivables'],
    queryFn: () => api.get<Receivable[]>('/receivables'),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['receivables'] });

  const followUp = useMutation({
    mutationFn: (vars: { id: string; outcome: string }) =>
      api.post(`/receivables/${vars.id}/follow-up`, { outcome: vars.outcome }),
    onSuccess: () => {
      invalidate();
      setFollowUpFor(null);
      setOutcome('');
    },
  });

  const markReceived = useMutation({
    mutationFn: (id: string) => api.post(`/receivables/${id}/received`),
    onSuccess: invalidate,
  });

  function openFollowUp(r: Receivable) {
    setFollowUpFor(r);
    setOutcome('');
  }

  function submitFollowUp(e: React.FormEvent) {
    e.preventDefault();
    if (!followUpFor || !outcome.trim()) return;
    followUp.mutate({ id: followUpFor.id, outcome: outcome.trim() });
  }

  if (isLoading || !data) return <Spinner />;

  return (
    <div>
      <PageHeader title="Receivables" subtitle="Outstanding payments by age" />

      {data.length === 0 ? (
        <EmptyState title="Nothing outstanding" hint="All receivables are settled." />
      ) : (
        <div className="space-y-4">
          {data.map((r) => (
            <Card key={r.id}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-slate-900">{r.project.name}</p>
                    <Badge color={BUCKET_COLOR[r.bucket]}>{BUCKET_LABEL[r.bucket]}</Badge>
                  </div>
                  <p className="mt-1 text-lg font-semibold text-slate-900">
                    {formatINR(r.expectedAmount)}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {r.dueDate ? `Due ${formatISTDate(r.dueDate)}` : 'No due date'}
                    {r.overdue ? ` · ${r.daysOverdue} days overdue` : ''}
                  </p>
                  {r.lastFollowUp ? (
                    <p className="mt-2 text-xs text-slate-500">
                      Last follow-up {formatISTDate(r.lastFollowUp.contactedAt)}
                      {r.lastFollowUp.outcome ? `: ${r.lastFollowUp.outcome}` : ''}
                    </p>
                  ) : null}
                </div>

                <Can cap="receivables:manage">
                  <div className="flex shrink-0 gap-2">
                    <Button variant="secondary" onClick={() => openFollowUp(r)}>
                      Log follow-up
                    </Button>
                    <Button
                      onClick={() => markReceived.mutate(r.id)}
                      disabled={markReceived.isPending}
                    >
                      Mark received
                    </Button>
                  </div>
                </Can>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={followUpFor !== null}
        onClose={() => setFollowUpFor(null)}
        title="Log follow-up"
      >
        <form onSubmit={submitFollowUp} className="space-y-4">
          <Field label="Outcome">
            <textarea
              className="input min-h-[120px]"
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              placeholder="Describe the conversation or outcome…"
              required
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setFollowUpFor(null)}>
              Cancel
            </Button>
            <Button type="submit" disabled={followUp.isPending || !outcome.trim()}>
              {followUp.isPending ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
