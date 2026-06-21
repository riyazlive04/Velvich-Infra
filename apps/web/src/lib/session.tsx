'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Capability } from '@velvich/shared';
import { api } from './api';
import type { MeResponse } from './types';

interface SessionContextValue {
  me: MeResponse | null;
  isLoading: boolean;
  permissions: Set<Capability>;
}

const SessionContext = createContext<SessionContextValue>({
  me: null,
  isLoading: true,
  permissions: new Set(),
});

export function useMe(): MeResponse | null {
  return useContext(SessionContext).me;
}

export function useSessionState() {
  return useContext(SessionContext);
}

/**
 * Permission-aware UI gate. Mirrors the server's effective permissions from /me.
 * This is convenience only — the API independently enforces every action.
 */
export function useCan(capability: Capability): boolean {
  return useContext(SessionContext).permissions.has(capability);
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const { data, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: () => api.get<MeResponse>('/me'),
    retry: false,
    staleTime: 30_000,
  });

  const value = useMemo<SessionContextValue>(
    () => ({
      me: data ?? null,
      isLoading,
      permissions: new Set(data?.permissions ?? []),
    }),
    [data, isLoading],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
