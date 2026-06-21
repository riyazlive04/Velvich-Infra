'use client';

import { useEffect, useState } from 'react';
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
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold text-brand-700">Velvich Infra CRM</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to continue</p>
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
    </div>
  );
}
