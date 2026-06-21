'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSessionState } from '@/lib/session';
import { AppShell } from '@/components/app-shell';
import { Spinner } from '@/components/ui';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { me, isLoading } = useSessionState();

  useEffect(() => {
    if (!isLoading && !me) router.replace('/login');
  }, [me, isLoading, router]);

  if (isLoading) return <Spinner />;
  if (!me) return <Spinner />;

  return <AppShell>{children}</AppShell>;
}
