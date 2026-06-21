'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useMe } from '@/lib/session';
import { PageHeader, Can } from '@/components/app-shell';
import { Button, Input, Field, Card, Badge, Modal, EmptyState, Spinner } from '@/components/ui';

interface Contact {
  id?: string;
  name: string;
  role?: string | null;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
}

interface Client {
  id: string;
  name: string;
  deptType: string;
  city: string | null;
  contacts: Contact[];
  projectCount: number;
}

interface ClientPayload {
  name: string;
  deptType: string;
  city?: string;
  contacts: Array<{
    name: string;
    role?: string;
    phone?: string;
    email?: string;
    notes?: string;
  }>;
}

interface ContactForm {
  name: string;
  role: string;
  phone: string;
  email: string;
}

const emptyContact = (): ContactForm => ({ name: '', role: '', phone: '', email: '' });

export default function ClientsPage() {
  const me = useMe();
  const queryClient = useQueryClient();
  const deptTypes = me?.organization?.settings?.deptTypes ?? [];

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);

  const [name, setName] = useState('');
  const [deptType, setDeptType] = useState('');
  const [city, setCity] = useState('');
  const [contacts, setContacts] = useState<ContactForm[]>([emptyContact()]);

  const { data: clients, isLoading } = useQuery({
    queryKey: ['clients', search],
    queryFn: () => api.get<Client[]>(`/clients?search=${encodeURIComponent(search)}`),
  });

  function resetForm() {
    setEditing(null);
    setName('');
    setDeptType('');
    setCity('');
    setContacts([emptyContact()]);
  }

  function openCreate() {
    resetForm();
    setDeptType(deptTypes[0] ?? '');
    setModalOpen(true);
  }

  function openEdit(client: Client) {
    setEditing(client);
    setName(client.name);
    setDeptType(client.deptType);
    setCity(client.city ?? '');
    setContacts(
      client.contacts.length > 0
        ? client.contacts.map((c) => ({
            name: c.name,
            role: c.role ?? '',
            phone: c.phone ?? '',
            email: c.email ?? '',
          }))
        : [emptyContact()],
    );
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    resetForm();
  }

  const saveMutation = useMutation({
    mutationFn: (payload: ClientPayload) =>
      editing ? api.put(`/clients/${editing.id}`, payload) : api.post('/clients', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/clients/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });

  function updateContact(index: number, field: keyof ContactForm, value: string) {
    setContacts((prev) => prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)));
  }

  function addContact() {
    setContacts((prev) => [...prev, emptyContact()]);
  }

  function removeContact(index: number) {
    setContacts((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload: ClientPayload = {
      name: name.trim(),
      deptType,
      city: city.trim() || undefined,
      contacts: contacts
        .filter((c) => c.name.trim())
        .map((c) => ({
          name: c.name.trim(),
          role: c.role.trim() || undefined,
          phone: c.phone.trim() || undefined,
          email: c.email.trim() || undefined,
        })),
    };
    saveMutation.mutate(payload);
  }

  return (
    <div>
      <PageHeader
        title="Clients"
        subtitle="Departments and organisations you work with"
        action={
          <Can cap="clients:manage">
            <Button onClick={openCreate}>Add client</Button>
          </Can>
        }
      />

      <div className="mb-4">
        <Input
          placeholder="Search clients…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <Spinner />
      ) : !clients || clients.length === 0 ? (
        <EmptyState
          title="No clients found"
          hint={search ? 'Try a different search.' : 'Add your first client to get started.'}
          action={
            <Can cap="clients:manage">
              <Button onClick={openCreate}>Add client</Button>
            </Can>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clients.map((client) => (
            <Card key={client.id}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{client.name}</p>
                  {client.city ? (
                    <p className="text-xs text-slate-500">{client.city}</p>
                  ) : null}
                </div>
                <Badge color="blue">{client.deptType}</Badge>
              </div>

              <div className="mt-3 flex items-center gap-4 text-sm text-slate-600">
                <span>{client.projectCount} projects</span>
                <span>{client.contacts.length} contacts</span>
              </div>

              <Can cap="clients:manage">
                <div className="mt-4 flex gap-2">
                  <Button variant="secondary" onClick={() => openEdit(client)}>
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      if (confirm(`Delete client "${client.name}"?`)) {
                        deleteMutation.mutate(client.id);
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

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? 'Edit client' : 'Add client'}
        wide
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name">
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </Field>
            <Field label="Department type">
              <select
                className="input"
                value={deptType}
                onChange={(e) => setDeptType(e.target.value)}
                required
              >
                <option value="" disabled>
                  Select type…
                </option>
                {deptTypes.map((dt) => (
                  <option key={dt} value={dt}>
                    {dt}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="City">
            <Input value={city} onChange={(e) => setCity(e.target.value)} />
          </Field>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="label">Contacts</label>
              <Button type="button" variant="secondary" onClick={addContact}>
                Add contact
              </Button>
            </div>
            <div className="space-y-3">
              {contacts.map((contact, index) => (
                <div key={index} className="rounded-lg border border-slate-200 p-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                      placeholder="Name"
                      value={contact.name}
                      onChange={(e) => updateContact(index, 'name', e.target.value)}
                    />
                    <Input
                      placeholder="Role"
                      value={contact.role}
                      onChange={(e) => updateContact(index, 'role', e.target.value)}
                    />
                    <Input
                      placeholder="Phone"
                      value={contact.phone}
                      onChange={(e) => updateContact(index, 'phone', e.target.value)}
                    />
                    <Input
                      placeholder="Email"
                      type="email"
                      value={contact.email}
                      onChange={(e) => updateContact(index, 'email', e.target.value)}
                    />
                  </div>
                  {contacts.length > 1 ? (
                    <div className="mt-2 flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => removeContact(index)}
                      >
                        Remove
                      </Button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          {saveMutation.isError ? (
            <p className="text-sm text-red-600">
              {(saveMutation.error as Error).message}
            </p>
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
