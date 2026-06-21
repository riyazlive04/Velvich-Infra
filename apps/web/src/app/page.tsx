'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSessionState } from '@/lib/session';
import { Spinner } from '@/components/ui';

export default function Home() {
  const router = useRouter();
  const { me, isLoading } = useSessionState();

  useEffect(() => {
    if (isLoading) return;
    router.replace(me ? '/dashboard' : '/login');
  }, [me, isLoading, router]);

  return <Spinner />;
}
