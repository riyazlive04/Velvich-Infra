'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import {
  LayoutDashboard,
  FolderKanban,
  Users2,
  Receipt,
  Wallet,
  BookOpen,
  Clock4,
  Activity,
  FileText,
  UserCog,
  Settings,
  ScrollText,
  HardHat,
  Menu,
  LogOut,
} from 'lucide-react';
import type { Capability } from '@velvich/shared';
import { signOut } from '@/lib/api';
import { useCan, useMe } from '@/lib/session';
import { cn } from '@/lib/cn';

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  cap: Capability;
}

const NAV: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, cap: 'dashboard:view' },
  { href: '/projects', label: 'Projects', icon: FolderKanban, cap: 'projects:view' },
  { href: '/clients', label: 'Clients', icon: Users2, cap: 'clients:view' },
  { href: '/staff', label: 'Staff', icon: HardHat, cap: 'staff:view' },
  { href: '/transactions', label: 'Transactions', icon: Receipt, cap: 'transactions:view' },
  { href: '/accounts', label: 'Accounts', icon: Wallet, cap: 'accounts:view' },
  { href: '/ledger', label: 'Ledger', icon: BookOpen, cap: 'ledger:view' },
  { href: '/receivables', label: 'Receivables', icon: Clock4, cap: 'receivables:view' },
  { href: '/activities', label: 'Activities', icon: Activity, cap: 'activities:view' },
  { href: '/reports', label: 'Reports', icon: FileText, cap: 'reports:view' },
  { href: '/users', label: 'Users & Access', icon: UserCog, cap: 'users:manage' },
  { href: '/settings', label: 'Settings', icon: Settings, cap: 'settings:manage' },
  { href: '/audit', label: 'Audit Log', icon: ScrollText, cap: 'audit:view' },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const permissions = useMe()?.permissions ?? [];
  const allowed = new Set(permissions);
  return (
    <nav className="space-y-1">
      {NAV.filter((n) => allowed.has(n.cap)).map((item) => {
        const active = pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium',
              active ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100',
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const me = useMe();
  const router = useRouter();
  const qc = useQueryClient();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleSignOut() {
    await signOut();
    await qc.invalidateQueries({ queryKey: ['me'] });
    router.replace('/login');
  }

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-white p-4 lg:block">
        <div className="mb-6 px-2">
          <p className="font-bold text-brand-700">Velvich Infra</p>
          <p className="text-xs text-slate-500">{me?.organization?.name ?? 'CRM'}</p>
        </div>
        <NavLinks />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-white p-4">
            <p className="mb-6 px-2 font-bold text-brand-700">Velvich Infra</p>
            <NavLinks onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
          <button className="btn-ghost p-2 lg:hidden" onClick={() => setMobileOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium">{me?.user.name}</p>
              <p className="text-xs text-slate-500">{me?.user.role}</p>
            </div>
            <button onClick={handleSignOut} className="btn-ghost p-2" title="Sign out">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}

/** Convenience wrapper for a page header with an action slot. */
export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">{title}</h1>
        {subtitle ? <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

/** Hide children unless the user holds the capability (UI convenience only). */
export function Can({ cap, children }: { cap: Capability; children: ReactNode }) {
  const allowed = useCan(cap);
  return allowed ? <>{children}</> : null;
}
