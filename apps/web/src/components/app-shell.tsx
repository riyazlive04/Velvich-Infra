'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
  X,
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

function Brand() {
  return (
    <div className="rounded-xl bg-white p-3 shadow-sm">
      <Image
        src="/logo-wordmark.png"
        alt="Velvich Infra"
        width={604}
        height={330}
        priority
        className="mx-auto h-11 w-auto"
      />
    </div>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const allowed = new Set(useMe()?.permissions ?? []);
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
            className={cn('nav-link', active && 'nav-link-active')}
          >
            <Icon className="h-4 w-4 shrink-0" />
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

  const initials = (me?.user.name ?? '?')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col bg-navy-900 p-4 lg:flex">
        <Brand />
        <p className="mb-5 mt-3 px-1 text-xs font-medium text-navy-200/70">
          {me?.organization?.name ?? 'Velvich Infra'}
        </p>
        <NavLinks />
        <div className="mt-auto px-1 pt-4 text-[0.7rem] text-navy-200/50">
          Velvich Infra CRM · Phase 1
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-navy-950/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-72 flex-col bg-navy-900 p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-medium text-navy-200/70">Menu</span>
              <button className="rounded-lg p-1 text-navy-100 hover:bg-white/10" onClick={() => setMobileOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <Brand />
            <div className="mt-4">
              <NavLinks onNavigate={() => setMobileOpen(false)} />
            </div>
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur">
          <button
            className="rounded-lg p-2 text-navy-700 hover:bg-slate-100 lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-semibold text-navy-900">{me?.user.name}</p>
              <p className="text-xs text-slate-500">{me?.user.role}</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-navy-700 text-xs font-bold text-white">
              {initials}
            </div>
            <button
              onClick={handleSignOut}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-navy-700"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}

/** Page header with an optional brand eyebrow and an action slot. */
export function PageHeader({
  title,
  subtitle,
  eyebrow,
  action,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        {eyebrow ? <span className="eyebrow mb-2">{eyebrow}</span> : null}
        <h1 className="text-2xl font-bold tracking-tight text-navy-900">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

/** Hide children unless the user holds the capability (UI convenience only). */
export function Can({ cap, children }: { cap: Capability; children: ReactNode }) {
  return useCan(cap) ? <>{children}</> : null;
}
