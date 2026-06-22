'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { api, signIn } from '@/lib/api';
import { Button, Card, Field, Input } from '@/components/ui';

export default function OnboardingPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    orgName: 'Velvich Infra',
    ownerName: '',
    email: '',
    phone: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function set(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/onboarding', {
        org: { name: form.orgName },
        owner: {
          name: form.ownerName,
          email: form.email,
          phone: form.phone || undefined,
          password: form.password,
        },
      });
      await signIn(form.email, form.password);
      await qc.invalidateQueries({ queryKey: ['me'] });
      router.replace('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Setup failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-900 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center">
          <div className="rounded-2xl bg-white p-4 shadow-lg">
            <Image src="/logo-wordmark.png" alt="Velvich Infra" width={604} height={330} priority className="h-14 w-auto" />
          </div>
        </div>
        <Card className="w-full p-6">
        <div className="mb-6">
          <span className="eyebrow mb-2">First-time setup</span>
          <h1 className="text-xl font-bold text-navy-900">Welcome</h1>
          <p className="mt-1 text-sm text-slate-500">
            Create your organisation and the Owner account.
          </p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Organisation name">
            <Input value={form.orgName} onChange={(e) => set('orgName', e.target.value)} required />
          </Field>
          <Field label="Your name">
            <Input value={form.ownerName} onChange={(e) => set('ownerName', e.target.value)} required />
          </Field>
          <Field label="Email">
            <Input
              type="email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              required
            />
          </Field>
          <Field label="Phone (optional)">
            <Input value={form.phone} onChange={(e) => set('phone', e.target.value)} />
          </Field>
          <Field label="Password">
            <Input
              type="password"
              value={form.password}
              onChange={(e) => set('password', e.target.value)}
              required
              minLength={8}
            />
          </Field>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Setting up…' : 'Create organisation & owner'}
          </Button>
        </form>
        </Card>
      </div>
    </div>
  );
}
