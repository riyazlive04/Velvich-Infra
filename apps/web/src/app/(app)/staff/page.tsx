'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useMe } from '@/lib/session';
import { PageHeader, Can } from '@/components/app-shell';
import { Button, Input, Field, Card, Badge, Modal, EmptyState, Spinner } from '@/components/ui';

interface StaffProject {
  id: string;
  name: string;
  stage: string;
}

interface Staff {
  id: string;
  name: string;
  role: string;
  phone: string | null;
  skills: string | null;
  totalProjects: number;
  activeProjects: number;
  overAllocated: boolean;
  projects: StaffProject[];
}

interface StaffPayload {
  name: string;
  role: string;
  phone?: string;
  skills?: string;
}

export default function StaffPage() {
  const me = useMe();
  const queryClient = useQueryClient();
  const staffRoles = me?.organization?.settings?.staffRoles ?? [];

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Staff | null>(null);

  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [phone, setPhone] = useState('');
  const [skills, setSkills] = useState('');

  const { data: staff, isLoading } = useQuery({
    queryKey: ['staff'],
    queryFn: () => api.get<Staff[]>('/staff'),
  });

  function resetForm() {
    setEditing(null);
    setName('');
    setRole('');
    setPhone('');
    setSkills('');
  }

  function openCreate() {
    resetForm();
    setRole(staffRoles[0] ?? '');
    setModalOpen(true);
  }

  function openEdit(member: Staff) {
    setEditing(member);
    setName(member.name);
    setRole(member.role);
    setPhone(member.phone ?? '');
    setSkills(member.skills ?? '');
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    resetForm();
  }

  const saveMutation = useMutation({
    mutationFn: (payload: StaffPayload) =>
      editing ? api.put(`/staff/${editing.id}`, payload) : api.post('/staff', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/staff/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload: StaffPayload = {
      name: name.trim(),
      role,
      phone: phone.trim() || undefined,
      skills: skills.trim() || undefined,
    };
    saveMutation.mutate(payload);
  }

  return (
    <div>
      <PageHeader
        title="Staff"
        subtitle="Team members and their project load"
        action={
          <Can cap="staff:manage">
            <Button onClick={openCreate}>Add staff</Button>
          </Can>
        }
      />

      {isLoading ? (
        <Spinner />
      ) : !staff || staff.length === 0 ? (
        <EmptyState
          title="No staff yet"
          hint="Add your first team member to get started."
          action={
            <Can cap="staff:manage">
              <Button onClick={openCreate}>Add staff</Button>
            </Can>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {staff.map((member) => (
            <Card key={member.id}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{member.name}</p>
                  <p className="text-xs text-slate-500">{member.role}</p>
                </div>
                {member.overAllocated ? <Badge color="red">Over-allocated</Badge> : null}
              </div>

              {member.phone ? (
                <p className="mt-2 text-sm text-slate-600">{member.phone}</p>
              ) : null}
              {member.skills ? (
                <p className="mt-1 text-xs text-slate-500">{member.skills}</p>
              ) : null}

              <p className="mt-3 text-sm text-slate-600">
                {member.activeProjects} active / {member.totalProjects} total projects
              </p>

              <Can cap="staff:manage">
                <div className="mt-4 flex gap-2">
                  <Button variant="secondary" onClick={() => openEdit(member)}>
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      if (confirm(`Delete staff "${member.name}"?`)) {
                        deleteMutation.mutate(member.id);
                      }
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </Can>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={closeModal} title={editing ? 'Edit staff' : 'Add staff'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Name">
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>

          <Field label="Role">
            <select
              className="input"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              required
            >
              <option value="" disabled>
                Select role…
              </option>
              {staffRoles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Phone">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>

          <Field label="Skills">
            <Input value={skills} onChange={(e) => setSkills(e.target.value)} />
          </Field>

          {saveMutation.isError ? (
            <p className="text-sm text-red-600">{(saveMutation.error as Error).message}</p>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
