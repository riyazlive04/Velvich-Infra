'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatINR } from '@/lib/format';
import { PageHeader } from '@/components/app-shell';
import { Badge, Card, EmptyState, Spinner } from '@/components/ui';

interface ProjectAccount {
  projectId: string;
  name: string;
  stage: string;
  contractAmount: number | null;
  incomeReceived: number;
  incomePending: number;
  expenseSpent: number;
  net: number;
  collectionPercent: number | null;
}

function CollectionBar({ percent }: { percent: number | null }) {
  if (percent === null) return <span className="text-slate-400">-</span>;
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-brand-600" style={{ width: `${clamped}%` }} />
      </div>
      <span className="text-xs text-slate-600">{Math.round(percent)}%</span>
    </div>
  );
}

export default function AccountsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => api.get<ProjectAccount[]>('/accounts'),
  });

  if (isLoading || !data) return <Spinner />;

  return (
    <div>
      <PageHeader title="Project Accounts" subtitle="Computed profit & loss per project" />

      {data.length === 0 ? (
        <EmptyState title="No projects yet" hint="Account figures appear once projects exist." />
      ) : (
        <>
          {/* Desktop table */}
          <Card className="hidden p-0 lg:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                    <th className="px-4 py-3 font-medium">Project</th>
                    <th className="px-4 py-3 font-medium">Stage</th>
                    <th className="px-4 py-3 text-right font-medium">Contract</th>
                    <th className="px-4 py-3 text-right font-medium">Income received</th>
                    <th className="px-4 py-3 text-right font-medium">Expense</th>
                    <th className="px-4 py-3 text-right font-medium">Net</th>
                    <th className="px-4 py-3 font-medium">Collection %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.map((row) => (
                    <tr key={row.projectId}>
                      <td className="px-4 py-3 font-medium text-slate-900">{row.name}</td>
                      <td className="px-4 py-3">
                        <Badge>{row.stage}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {row.contractAmount === null ? (
                          <span className="text-slate-400">-</span>
                        ) : (
                          formatINR(row.contractAmount)
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-green-600">
                        {formatINR(row.incomeReceived)}
                      </td>
                      <td className="px-4 py-3 text-right text-red-600">
                        {formatINR(row.expenseSpent)}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-medium ${row.net >= 0 ? 'text-green-600' : 'text-red-600'}`}
                      >
                        {formatINR(row.net)}
                      </td>
                      <td className="px-4 py-3">
                        <CollectionBar percent={row.collectionPercent} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Mobile cards */}
          <div className="space-y-4 lg:hidden">
            {data.map((row) => (
              <Card key={row.projectId}>
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-slate-900">{row.name}</p>
                  <Badge>{row.stage}</Badge>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <dt className="text-xs text-slate-500">Contract</dt>
                    <dd>
                      {row.contractAmount === null ? (
                        <span className="text-slate-400">-</span>
                      ) : (
                        formatINR(row.contractAmount)
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Income received</dt>
                    <dd className="text-green-600">{formatINR(row.incomeReceived)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Expense</dt>
                    <dd className="text-red-600">{formatINR(row.expenseSpent)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Net</dt>
                    <dd className={row.net >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {formatINR(row.net)}
                    </dd>
                  </div>
                </dl>
                <div className="mt-3">
                  <p className="mb-1 text-xs text-slate-500">Collection %</p>
                  <CollectionBar percent={row.collectionPercent} />
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
