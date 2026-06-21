'use client';

import { useState } from 'react';
import { PageHeader, Can } from '@/components/app-shell';
import { Card, Field } from '@/components/ui';

function currentMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export default function ReportsPage() {
  const [month, setMonth] = useState(currentMonth());

  const txAll = `/api/reports/transactions.xlsx?month=${month}`;
  const txIncome = `/api/reports/transactions.xlsx?month=${month}&type=INCOME`;
  const txExpense = `/api/reports/transactions.xlsx?month=${month}&type=EXPENSE`;
  const ledger = `/api/reports/ledger.xlsx?month=${month}`;

  return (
    <div>
      <PageHeader
        title="Reports & Exports"
        subtitle="Excel exports for the selected month. PDF export is coming in a later phase."
      />

      <div className="mb-6 max-w-xs">
        <Field label="Month">
          <input
            className="input"
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        </Field>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Card>
          <h2 className="font-semibold">Transactions (Excel)</h2>
          <p className="mt-1 text-sm text-slate-500">Income and expense entries for {month}.</p>
          <Can cap="reports:export">
            <div className="mt-4 flex flex-wrap gap-2">
              <a href={txAll} download className="btn-primary">
                All
              </a>
              <a href={txIncome} download className="btn-primary">
                Income only
              </a>
              <a href={txExpense} download className="btn-primary">
                Expense only
              </a>
            </div>
          </Can>
        </Card>

        <Card>
          <h2 className="font-semibold">Monthly Ledger (Excel)</h2>
          <p className="mt-1 text-sm text-slate-500">Full ledger for {month}.</p>
          <Can cap="reports:export">
            <div className="mt-4 flex flex-wrap gap-2">
              <a href={ledger} download className="btn-primary">
                Download ledger
              </a>
            </div>
          </Can>
        </Card>
      </div>
    </div>
  );
}
