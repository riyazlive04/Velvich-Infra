'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useMe } from '@/lib/session';
import { formatISTDate } from '@/lib/format';
import { PageHeader, Can } from '@/components/app-shell';
import { Button, Field, Card, Badge, Modal, EmptyState, Spinner } from '@/components/ui';

interface Activity {
  id: string;
  type: string;
  date: string;
  notes: string | null;
  projectId: string | null;
  project: { id: string; name: string } | null;
  staff: { id: string; name: string } | null;
  photoKey: string | null;
}

interface ProjectOption {
  id: string;
  name: string;
}

interface ActivityPayload {
  type: string;
  date: string;
  notes?: string;
  projectId?: string;
  staffId?: string;
}

function todayISODate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function ActivitiesPage() {
  const me = useMe();
  const queryClient = useQueryClient();
  const activityTypes = (me?.organization?.settings?.activityTypes ?? []) as string[];

  const [modalOpen, setModalOpen] = useState(false);
  const [type, setType] = useState('');
  const [date, setDate] = useState(todayISODate());
  const [projectId, setProjectId] = useState('');
  const [notes, setNotes] = useState('');

  const { data: activities, isLoading } = useQuery({
    queryKey: ['activities'],
    queryFn: () => api.get<Activity[]>('/activities'),
  });

  const { data: projects } = useQuery({
    queryKey: ['projects', 'options'],
    queryFn: () => api.get<ProjectOption[]>('/projects'),
    retry: false,
  });

  function resetForm() {
    setType('');
    setDate(todayISODate());
    setProjectId('');
    setNotes('');
  }

  function openCreate() {
    resetForm();
    setType(activityTypes[0] ?? '');
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    resetForm();
  }

  const createMutation = useMutation({
    mutationFn: (payload: ActivityPayload) => api.post('/activities', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/activities/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload: ActivityPayload = {
      type,
      date: new Date(date).toISOString(),
      notes: notes.trim() || undefined,
      projectId: projectId || undefined,
    };
    createMutation.mutate(payload);
  }

  const sorted = (activities ?? [])
    .slice()
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div>
      <PageHeader
        title="Activity Log"
        subtitle="Site visits, meetings and follow-ups"
        action={
          <Can cap="activities:create">
            <Button onClick={openCreate}>Log activity</Button>
          </Can>
        }
      />

      {isLoading ? (
        <Spinner />
      ) : sorted.length === 0 ? (
        <EmptyState
          title="No activities yet"
          hint="Log your first activity to get started."
          action={
            <Can cap="activities:create">
              <Button onClick={openCreate}>Log activity</Button>
            </Can>
          }
        />
      ) : (
        <div className="space-y-3">
          {sorted.map((activity) => (
            <Card key={activity.id}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge color="blue">{activity.type}</Badge>
                    <span className="text-xs text-slate-500">{formatISTDate(activity.date)}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 text-sm text-slate-600">
                    {activity.project ? <span>{activity.project.name}</span> : null}
                    {activity.staff ? <span>By {activity.staff.name}</span> : null}
                  </div>
                  {activity.notes ? (
                    <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{activity.notes}</p>
                  ) : null}
                </div>
                <Can cap="activities:delete">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      if (confirm('Delete this activity?')) {
                        deleteMutation.mutate(activity.id);
                      }
                    }}
                  >
                    Delete
                  </Button>
                </Can>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={closeModal} title="Log activity">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Type">
            <select
              className="input"
              value={type}
              onChange={(e) => setType(e.target.value)}
              required
            >
              <option value="" disabled>
                Select type…
              </option>
              {activityTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Date">
            <input
              className="input"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </Field>

          <Field label="Project">
            <select
              className="input"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
            >
              <option value="">No project</option>
              {(projects ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Notes">
            <textarea
              className="input"
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>

          {createMutation.isError ? (
            <p className="text-sm text-red-600">{(createMutation.error as Error).message}</p>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
