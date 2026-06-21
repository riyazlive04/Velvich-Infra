'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Sparkles, Camera, Pencil } from 'lucide-react';
import { api } from '@/lib/api';
import { useMe } from '@/lib/session';
import { formatINR, formatISTDate, rupeesToPaise, paiseToRupees } from '@/lib/format';
import { PageHeader, Can } from '@/components/app-shell';
import { Badge, Button, Card, EmptyState, Field, Input, Modal, Spinner } from '@/components/ui';

interface Txn {
  id: string;
  type: 'INCOME' | 'EXPENSE';
  category: string;
  description: string | null;
  amount: number;
  date: string;
  incomeStatus: 'RECEIVED' | 'PENDING' | null;
  paidVia: string | null;
  source: string;
  project: { id: string; name: string } | null;
}
interface ListResponse {
  transactions: Txn[];
  totals: { incomeReceived: number; incomePending: number; expense: number; net: number };
}
interface Draft {
  type: 'INCOME' | 'EXPENSE';
  amount: number;
  date: string;
  vendor?: string;
  suggestedCategory?: string;
  suggestedProjectId?: string;
  confidence: number;
  receiptKey?: string;
}

const todayISO = () => new Date().toISOString().slice(0, 10);

export default function TransactionsPage() {
  const qc = useQueryClient();
  const me = useMe();
  const settings = me?.organization?.settings;

  const [typeFilter, setTypeFilter] = useState<'' | 'INCOME' | 'EXPENSE'>('');
  const [month, setMonth] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [prefill, setPrefill] = useState<Partial<TxnFormValues> | null>(null);
  const [source, setSource] = useState('manual');

  const query = new URLSearchParams();
  if (typeFilter) query.set('type', typeFilter);
  if (month) query.set('month', month);

  const { data, isLoading } = useQuery({
    queryKey: ['transactions', typeFilter, month],
    queryFn: () => api.get<ListResponse>(`/transactions?${query.toString()}`),
  });

  const { data: projects } = useQuery({
    queryKey: ['projects-mini'],
    queryFn: () => api.get<Array<{ id: string; name: string }>>('/projects'),
    retry: false,
  });

  function openManual() {
    setPrefill({ type: 'EXPENSE', date: todayISO() });
    setSource('manual');
    setFormOpen(true);
  }

  function openFromDraft(draft: Draft, src: string) {
    setPrefill({
      type: draft.type,
      amount: draft.amount ? String(paiseToRupees(draft.amount)) : '',
      date: draft.date?.slice(0, 10) || todayISO(),
      category: draft.suggestedCategory ?? '',
      projectId: draft.suggestedProjectId ?? '',
      description: draft.vendor ?? '',
      incomeStatus: 'RECEIVED',
      receiptKey: draft.receiptKey,
      _confidence: draft.confidence,
    });
    setSource(src);
    setAiOpen(false);
    setFormOpen(true);
  }

  return (
    <div>
      <PageHeader
        title="Transactions"
        subtitle="Income & expenses — log by photo, by sentence, or manually"
        action={
          <Can cap="transactions:create">
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setAiOpen(true)}>
                <Sparkles className="h-4 w-4" /> AI add
              </Button>
              <Button onClick={openManual}>
                <Pencil className="h-4 w-4" /> Manual
              </Button>
            </div>
          </Can>
        }
      />

      {/* Totals */}
      {data ? (
        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Card className="p-4">
            <p className="text-xs text-slate-500">Income received</p>
            <p className="text-lg font-bold text-green-600">{formatINR(data.totals.incomeReceived, { compact: true })}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-slate-500">Income pending</p>
            <p className="text-lg font-bold text-amber-600">{formatINR(data.totals.incomePending, { compact: true })}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-slate-500">Expense</p>
            <p className="text-lg font-bold text-red-600">{formatINR(data.totals.expense, { compact: true })}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-slate-500">Net</p>
            <p className="text-lg font-bold text-brand-700">{formatINR(data.totals.net, { compact: true })}</p>
          </Card>
        </div>
      ) : null}

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-2">
        <select className="input max-w-[160px]" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as '')}>
          <option value="">All types</option>
          <option value="INCOME">Income</option>
          <option value="EXPENSE">Expense</option>
        </select>
        <input type="month" className="input max-w-[180px]" value={month} onChange={(e) => setMonth(e.target.value)} />
        {month ? (
          <Button variant="ghost" onClick={() => setMonth('')}>
            Clear month
          </Button>
        ) : null}
      </div>

      {isLoading ? (
        <Spinner />
      ) : !data || data.transactions.length === 0 ? (
        <EmptyState title="No transactions" hint="Add one by photo, sentence, or manually." />
      ) : (
        <Card className="p-0">
          <ul className="divide-y divide-slate-100">
            {data.transactions.map((t) => (
              <li key={t.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{t.category}</p>
                    {t.source !== 'manual' ? (
                      <Badge color="blue">{t.source === 'receipt_ai' ? 'receipt' : t.source === 'nl_ai' ? 'AI' : t.source}</Badge>
                    ) : null}
                    {t.incomeStatus === 'PENDING' ? <Badge color="amber">pending</Badge> : null}
                  </div>
                  <p className="text-xs text-slate-500">
                    {formatISTDate(t.date)}
                    {t.project ? ` · ${t.project.name}` : ''}
                    {t.description ? ` · ${t.description}` : ''}
                  </p>
                </div>
                <span className={t.type === 'INCOME' ? 'font-semibold text-green-600' : 'font-semibold text-red-600'}>
                  {t.type === 'INCOME' ? '+' : '−'}
                  {formatINR(t.amount)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {aiOpen ? (
        <AiAssistModal
          onClose={() => setAiOpen(false)}
          projects={projects ?? []}
          onDraft={openFromDraft}
        />
      ) : null}

      {formOpen && prefill ? (
        <Modal open onClose={() => setFormOpen(false)} title={source === 'manual' ? 'New transaction' : 'Confirm draft'} wide>
          <TransactionForm
            initial={prefill}
            source={source}
            projects={projects ?? []}
            incomeCategories={settings?.incomeCategories ?? []}
            expenseCategories={settings?.expenseCategories ?? []}
            onDone={async () => {
              setFormOpen(false);
              await qc.invalidateQueries({ queryKey: ['transactions'] });
              await qc.invalidateQueries({ queryKey: ['dashboard'] });
            }}
          />
        </Modal>
      ) : null}
    </div>
  );
}

// --- AI assist modal: NL quick-add + receipt capture -----------------------
function AiAssistModal({
  onClose,
  projects,
  onDraft,
}: {
  onClose: () => void;
  projects: Array<{ id: string; name: string }>;
  onDraft: (draft: Draft, source: string) => void;
}) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  const nl = useMutation({
    mutationFn: () => api.post<{ enabled: boolean; draft: Draft | null }>('/transactions/ai/quick-entry', { text }),
    onSuccess: (res) => {
      if (!res.enabled || !res.draft) {
        setError('AI is disabled. Use the manual form instead.');
        return;
      }
      onDraft(res.draft, 'nl_ai');
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Failed'),
  });

  const receipt = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      return api.postForm<{ enabled: boolean; draft: Draft | null; receiptKey?: string }>('/transactions/ai/receipt', fd);
    },
    onSuccess: (res) => {
      if (!res.enabled || !res.draft) {
        setError('AI is disabled, but the receipt was stored. Fill the manual form.');
        return;
      }
      onDraft(res.draft, 'receipt_ai');
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Upload failed'),
  });

  void projects;

  return (
    <Modal open onClose={onClose} title="AI assist — creates an editable draft">
      <div className="space-y-5">
        <div>
          <p className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
            <Sparkles className="h-4 w-4 text-brand-600" /> Type a quick line
          </p>
          <textarea
            className="input min-h-[70px]"
            placeholder="₹4,500 diesel for Rasipuram bypass yesterday"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <Button className="mt-2 w-full" disabled={nl.isPending || text.trim().length < 2} onClick={() => nl.mutate()}>
            {nl.isPending ? 'Reading…' : 'Parse to draft'}
          </Button>
        </div>

        <div className="relative text-center">
          <span className="bg-white px-2 text-xs uppercase tracking-wide text-slate-400">or</span>
          <div className="absolute left-0 right-0 top-1/2 -z-10 border-t border-slate-200" />
        </div>

        <div>
          <p className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
            <Camera className="h-4 w-4 text-brand-600" /> Snap or upload a bill
          </p>
          <input
            type="file"
            accept="image/*,application/pdf"
            className="input"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) receipt.mutate(f);
            }}
          />
          {receipt.isPending ? <p className="mt-2 text-sm text-slate-500">Extracting…</p> : null}
        </div>

        {error ? <p className="text-sm text-amber-700">{error}</p> : null}
        <p className="text-xs text-slate-400">
          Every AI result is an editable draft — nothing is saved until you confirm it.
        </p>
      </div>
    </Modal>
  );
}

// --- Shared transaction form (manual + draft confirmation) -----------------
interface TxnFormValues {
  type: 'INCOME' | 'EXPENSE';
  amount: string; // rupees in the form
  date: string;
  category: string;
  description: string;
  projectId: string;
  incomeStatus: 'RECEIVED' | 'PENDING';
  paidVia: string;
  reference: string;
  receiptKey?: string;
  _confidence?: number;
}

function TransactionForm({
  initial,
  source,
  projects,
  incomeCategories,
  expenseCategories,
  onDone,
}: {
  initial: Partial<TxnFormValues>;
  source: string;
  projects: Array<{ id: string; name: string }>;
  incomeCategories: string[];
  expenseCategories: string[];
  onDone: () => void;
}) {
  const [v, setV] = useState<TxnFormValues>({
    type: initial.type ?? 'EXPENSE',
    amount: initial.amount ?? '',
    date: initial.date ?? todayISO(),
    category: initial.category ?? '',
    description: initial.description ?? '',
    projectId: initial.projectId ?? '',
    incomeStatus: initial.incomeStatus ?? 'RECEIVED',
    paidVia: initial.paidVia ?? 'CASH',
    reference: initial.reference ?? '',
    receiptKey: initial.receiptKey,
    _confidence: initial._confidence,
  });
  const [error, setError] = useState('');

  const categories = v.type === 'INCOME' ? incomeCategories : expenseCategories;
  function set<K extends keyof TxnFormValues>(k: K, val: TxnFormValues[K]) {
    setV((prev) => ({ ...prev, [k]: val }));
  }

  const save = useMutation({
    mutationFn: () => {
      const body: Record<string, unknown> = {
        type: v.type,
        category: v.category,
        description: v.description || undefined,
        amount: rupeesToPaise(v.amount),
        date: new Date(v.date).toISOString(),
        projectId: v.projectId || undefined,
        reference: v.reference || undefined,
        receiptKey: v.receiptKey,
      };
      if (v.type === 'INCOME') body.incomeStatus = v.incomeStatus;
      else body.paidVia = v.paidVia;
      return api.post(`/transactions?source=${source}`, body);
    },
    onSuccess: onDone,
    onError: (e) => setError(e instanceof Error ? e.message : 'Failed to save'),
  });

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError('');
        if (!v.category) {
          setError('Please choose a category');
          return;
        }
        save.mutate();
      }}
    >
      {source !== 'manual' && v._confidence !== undefined ? (
        <div className="rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-700">
          AI draft · confidence {(v._confidence * 100).toFixed(0)}%. Review every field before saving.
        </div>
      ) : null}

      <div className="flex gap-2">
        {(['EXPENSE', 'INCOME'] as const).map((t) => (
          <button
            type="button"
            key={t}
            onClick={() => set('type', t)}
            className={`btn flex-1 ${v.type === t ? 'btn-primary' : 'btn-secondary'}`}
          >
            {t === 'EXPENSE' ? 'Expense' : 'Income'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Amount (₹)">
          <Input type="number" step="0.01" min="0" value={v.amount} onChange={(e) => set('amount', e.target.value)} required />
        </Field>
        <Field label="Date">
          <Input type="date" value={v.date} onChange={(e) => set('date', e.target.value)} required />
        </Field>
      </div>

      <Field label="Category">
        <select className="input" value={v.category} onChange={(e) => set('category', e.target.value)} required>
          <option value="">Select category…</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
          {v.category && !categories.includes(v.category) ? <option value={v.category}>{v.category}</option> : null}
        </select>
      </Field>

      <Field label="Project (optional)">
        <select className="input" value={v.projectId} onChange={(e) => set('projectId', e.target.value)}>
          <option value="">No project</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </Field>

      {v.type === 'INCOME' ? (
        <Field label="Status">
          <select className="input" value={v.incomeStatus} onChange={(e) => set('incomeStatus', e.target.value as 'RECEIVED')}>
            <option value="RECEIVED">Received</option>
            <option value="PENDING">Pending</option>
          </select>
        </Field>
      ) : (
        <Field label="Paid via">
          <select className="input" value={v.paidVia} onChange={(e) => set('paidVia', e.target.value)}>
            <option value="CASH">Cash</option>
            <option value="BANK">Bank</option>
            <option value="CHEQUE">Cheque</option>
            <option value="UPI">UPI</option>
          </select>
        </Field>
      )}

      <Field label="Description (optional)">
        <Input value={v.description} onChange={(e) => set('description', e.target.value)} />
      </Field>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Button type="submit" className="w-full" disabled={save.isPending}>
        {save.isPending ? 'Saving…' : 'Save transaction'}
      </Button>
    </form>
  );
}
