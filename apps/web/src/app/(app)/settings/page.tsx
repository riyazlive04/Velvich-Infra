'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/app-shell';
import { Button, Input, Field, Card, Spinner } from '@/components/ui';

interface Organization {
  id: string;
  name: string;
  address: string | null;
  gstin: string | null;
  pan: string | null;
  logoKey: string | null;
}

interface SettingsResponse {
  organization: Organization | null;
  settings: Record<string, string[]>;
}

interface OrganizationUpdate {
  name?: string;
  address?: string;
  gstin?: string;
  pan?: string;
}

const LIST_LABELS: Record<string, string> = {
  projectTypes: 'Project types',
  deptTypes: 'Department types',
  incomeCategories: 'Income categories',
  expenseCategories: 'Expense categories',
  activityTypes: 'Activity types',
  documentCategories: 'Document categories',
  staffRoles: 'Staff roles',
  milestoneLabels: 'Milestone labels',
};

export default function SettingsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get<SettingsResponse>('/settings'),
  });

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [gstin, setGstin] = useState('');
  const [pan, setPan] = useState('');

  const [listText, setListText] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!data) return;
    setName(data.organization?.name ?? '');
    setAddress(data.organization?.address ?? '');
    setGstin(data.organization?.gstin ?? '');
    setPan(data.organization?.pan ?? '');
    const text: Record<string, string> = {};
    for (const [key, values] of Object.entries(data.settings)) {
      text[key] = values.join('\n');
    }
    setListText(text);
  }, [data]);

  const orgMutation = useMutation({
    mutationFn: (organization: OrganizationUpdate) => api.put('/settings', { organization }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });

  const listsMutation = useMutation({
    mutationFn: (settings: Record<string, string[]>) => api.put('/settings', { settings }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });

  function saveOrg(e: React.FormEvent) {
    e.preventDefault();
    orgMutation.mutate({
      name: name.trim(),
      address: address.trim(),
      gstin: gstin.trim(),
      pan: pan.trim(),
    });
  }

  function saveLists() {
    const settings: Record<string, string[]> = {};
    for (const [key, text] of Object.entries(listText)) {
      settings[key] = text
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
    }
    listsMutation.mutate(settings);
  }

  if (isLoading || !data) return <Spinner />;

  return (
    <div>
      <PageHeader title="Settings" subtitle="Organisation profile and editable lists" />

      <div className="space-y-6">
        <Card>
          <h2 className="mb-4 font-semibold">Organisation profile</h2>
          <form onSubmit={saveOrg} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name">
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
              </Field>
              <Field label="GSTIN">
                <Input value={gstin} onChange={(e) => setGstin(e.target.value)} />
              </Field>
              <Field label="PAN">
                <Input value={pan} onChange={(e) => setPan(e.target.value)} />
              </Field>
              <Field label="Address">
                <Input value={address} onChange={(e) => setAddress(e.target.value)} />
              </Field>
            </div>

            {orgMutation.isError ? (
              <p className="text-sm text-red-600">{(orgMutation.error as Error).message}</p>
            ) : null}

            <div className="flex items-center justify-end gap-3">
              {orgMutation.isSuccess ? (
                <p className="text-sm text-green-600">Saved.</p>
              ) : null}
              <Button type="submit" disabled={orgMutation.isPending}>
                {orgMutation.isPending ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </form>
        </Card>

        <Card>
          <h2 className="mb-1 font-semibold">Editable lists</h2>
          <p className="mb-4 text-sm text-slate-500">One item per line.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {Object.keys(listText).map((key) => (
              <Field key={key} label={LIST_LABELS[key] ?? key}>
                <textarea
                  className="input"
                  rows={6}
                  value={listText[key]}
                  onChange={(e) =>
                    setListText((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                />
              </Field>
            ))}
          </div>

          {listsMutation.isError ? (
            <p className="mt-4 text-sm text-red-600">{(listsMutation.error as Error).message}</p>
          ) : null}

          <div className="mt-4 flex items-center justify-end gap-3">
            {listsMutation.isSuccess ? (
              <p className="text-sm text-green-600">Saved.</p>
            ) : null}
            <Button type="button" onClick={saveLists} disabled={listsMutation.isPending}>
              {listsMutation.isPending ? 'Saving…' : 'Save lists'}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
