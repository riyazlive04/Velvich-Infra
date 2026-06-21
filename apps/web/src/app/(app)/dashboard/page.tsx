'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatINR, formatISTDate } from '@/lib/format';
import { PageHeader } from '@/components/app-shell';
import { Badge, Card, Spinner } from '@/components/ui';

interface DashboardData {
  metrics: {
    activeProjects: number;
    incomeReceived: number;
    expense: number;
    net: number;
    overdueCount: number;
    overdueAmount: number;
  };
  recentTransactions: Array<{
    id: string;
    type: 'INCOME' | 'EXPENSE';
    category: string;
    amount: number;
    date: string;
    project: string | null;
  }>;
  overdue: Array<{ id: string; project: string; amount: number; daysOverdue: number; bucket: string }>;
  upcomingMilestones: Array<{
    id: string;
    label: string;
    project: string;
    dueDate: string | null;
    expectedAmount: number | null;
  }>;
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <Card>
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${tone ?? 'text-slate-900'}`}>{value}</p>
    </Card>
  );
}

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get<DashboardData>('/dashboard'),
  });

  if (isLoading || !data) return <Spinner />;
  const m = data.metrics;

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Overview of projects, money and alerts" />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Metric label="Active projects" value={String(m.activeProjects)} />
        <Metric label="Income received" value={formatINR(m.incomeReceived, { compact: true })} tone="text-green-600" />
        <Metric label="Expenses" value={formatINR(m.expense, { compact: true })} tone="text-red-600" />
        <Metric label="Net" value={formatINR(m.net, { compact: true })} tone="text-brand-700" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-semibold">Recent transactions</h2>
          {data.recentTransactions.length === 0 ? (
            <p className="text-sm text-slate-500">No transactions yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.recentTransactions.map((t) => (
                <li key={t.id} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <p className="font-medium">{t.category}</p>
                    <p className="text-xs text-slate-500">
                      {formatISTDate(t.date)}
                      {t.project ? ` · ${t.project}` : ''}
                    </p>
                  </div>
                  <span className={t.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}>
                    {t.type === 'INCOME' ? '+' : '−'}
                    {formatINR(t.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="space-y-6">
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">Overdue receivables</h2>
              <Link href="/receivables" className="text-sm text-brand-600">
                View all
              </Link>
            </div>
            {data.overdue.length === 0 ? (
              <p className="text-sm text-slate-500">Nothing overdue. 🎉</p>
            ) : (
              <ul className="space-y-2">
                {data.overdue.map((r) => (
                  <li key={r.id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium">{r.project}</p>
                      <p className="text-xs text-slate-500">{r.daysOverdue} days overdue</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge color="red">{r.bucket}</Badge>
                      <span>{formatINR(r.amount, { compact: true })}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <h2 className="mb-3 font-semibold">Upcoming milestones</h2>
            {data.upcomingMilestones.length === 0 ? (
              <p className="text-sm text-slate-500">No upcoming milestones.</p>
            ) : (
              <ul className="space-y-2">
                {data.upcomingMilestones.map((ms) => (
                  <li key={ms.id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium">{ms.label}</p>
                      <p className="text-xs text-slate-500">{ms.project}</p>
                    </div>
                    <div className="text-right">
                      {ms.expectedAmount ? <p>{formatINR(ms.expectedAmount, { compact: true })}</p> : null}
                      {ms.dueDate ? (
                        <p className="text-xs text-slate-500">{formatISTDate(ms.dueDate)}</p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
