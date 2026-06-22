'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { api, signIn } from '@/lib/api';
import { Button, Card, Field, Input } from '@/components/ui';

export default function LoginPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // If the system has no users yet, send the first visitor to onboarding.
  useEffect(() => {
    api
      .get<{ needsSetup: boolean }>('/onboarding/status')
      .then((s) => {
        if (s.needsSetup) router.replace('/onboarding');
      })
      .catch(() => undefined);
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(email, password);
      await qc.invalidateQueries({ queryKey: ['me'] });
      router.replace('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-900 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center">
          <div className="rounded-2xl bg-white p-4 shadow-lg">
            <Image src="/logo-wordmark.png" alt="Velvich Infra" width={604} height={330} priority className="h-14 w-auto" />
          </div>
          <p className="mt-4 text-sm font-medium text-navy-100/80">Project &amp; collections management</p>
        </div>
        <Card className="w-full p-6">
        <div className="mb-6">
          <h1 className="text-lg font-bold text-navy-900">Sign in</h1>
          <p className="mt-1 text-sm text-slate-500">Use your Velvich Infra account</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Email">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </Field>
          <Field label="Password">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </Field>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
        </Card>
        <p className="mt-6 text-center text-xs text-navy-200/50">Velvich Infra CRM</p>
      </div>
    </div>
  );
}
