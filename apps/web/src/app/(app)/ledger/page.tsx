'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatINR, formatISTDate } from '@/lib/format';
import { PageHeader } from '@/components/app-shell';
import { Card, EmptyState, Input, Spinner } from '@/components/ui';

interface LedgerEntry {
  id: string;
  date: string;
  type: 'INCOME' | 'EXPENSE';
  category: string;
  description: string | null;
  amount: number;
  balance: number;
}

interface LedgerData {
  month: string;
  opening: number;
  credits: number;
  debits: number;
  closing: number;
  statement: LedgerEntry[];
}

function SummaryCard({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <Card>
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${tone ?? 'text-slate-900'}`}>{value}</p>
    </Card>
  );
}

export default function LedgerPage() {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));

  const { data, isLoading } = useQuery({
    queryKey: ['ledger', month],
    queryFn: () => api.get<LedgerData>(`/ledger?month=${month}`),
  });

  return (
    <div>
      <PageHeader
        title="Monthly Ledger"
        action={
          <Input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="w-44"
          />
        }
      />

      {isLoading || !data ? (
        <Spinner />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <SummaryCard label="Opening" value={formatINR(data.opening)} />
            <SummaryCard label="Credits" value={formatINR(data.credits)} tone="text-green-600" />
            <SummaryCard label="Debits" value={formatINR(data.debits)} tone="text-red-600" />
            <SummaryCard label="Closing" value={formatINR(data.closing)} tone="text-brand-700" />
          </div>

          <div className="mt-6">
            {data.statement.length === 0 ? (
              <EmptyState
                title="No transactions this month"
                hint="Pick another month to view its statement."
              />
            ) : (
              <Card className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                        <th className="px-4 py-3 font-medium">Date</th>
                        <th className="px-4 py-3 font-medium">Type</th>
                        <th className="px-4 py-3 font-medium">Category / Description</th>
                        <th className="px-4 py-3 text-right font-medium">Amount</th>
                        <th className="px-4 py-3 text-right font-medium">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.statement.map((row) => {
                        const income = row.type === 'INCOME';
                        return (
                          <tr key={row.id}>
                            <td className="px-4 py-3 whitespace-nowrap">{formatISTDate(row.date)}</td>
                            <td className="px-4 py-3">
                              <span className={income ? 'text-green-600' : 'text-red-600'}>
                                {row.type}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-medium text-slate-900">{row.category}</p>
                              {row.description ? (
                                <p className="text-xs text-slate-500">{row.description}</p>
                              ) : null}
                            </td>
                            <td
                              className={`px-4 py-3 text-right font-medium ${income ? 'text-green-600' : 'text-red-600'}`}
                            >
                              {income ? '+' : '−'}
                              {formatINR(row.amount)}
                            </td>
                            <td className="px-4 py-3 text-right">{formatINR(row.balance)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
}
