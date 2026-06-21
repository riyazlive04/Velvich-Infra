import { Injectable } from '@nestjs/common';
import { rupeesToPaise } from '@velvich/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { AuthUser } from '../auth/auth-user';

/**
 * Prototype migration. Accepts a normalised JSON payload exported from the old
 * JSONBin prototype (clients/staff/projects/transactions/activities) and imports
 * it, returning a reconcile report comparing imported per-project income/expense
 * to any balances the prototype recorded.
 *
 * NOTE: the prototype's exact field names should be mapped in the web import
 * wizard before calling this; this endpoint expects already-normalised records.
 * Document re-linking (§11.3) is handled separately once files land on R2.
 */
export interface ImportPayload {
  clients?: Array<{ ref?: string; name: string; deptType: string; city?: string }>;
  staff?: Array<{ ref?: string; name: string; role: string; phone?: string }>;
  projects?: Array<{
    ref?: string;
    name: string;
    type: string;
    clientRef?: string;
    contractRupees?: number;
    stage?: string;
  }>;
  transactions?: Array<{
    type: 'INCOME' | 'EXPENSE';
    category: string;
    amountRupees: number;
    date: string;
    projectRef?: string;
    incomeStatus?: 'RECEIVED' | 'PENDING';
  }>;
  expectedBalances?: Record<string, { incomeRupees?: number; expenseRupees?: number }>;
}

@Injectable()
export class ImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async run(actor: AuthUser, payload: ImportPayload) {
    const clientRefMap = new Map<string, string>();
    const projectRefMap = new Map<string, string>();

    for (const c of payload.clients ?? []) {
      const created = await this.prisma.client.create({
        data: { name: c.name, deptType: c.deptType, city: c.city ?? null },
      });
      if (c.ref) clientRefMap.set(c.ref, created.id);
    }

    for (const s of payload.staff ?? []) {
      await this.prisma.staff.create({ data: { name: s.name, role: s.role, phone: s.phone ?? null } });
    }

    for (const p of payload.projects ?? []) {
      const created = await this.prisma.project.create({
        data: {
          name: p.name,
          type: p.type,
          clientId: p.clientRef ? (clientRefMap.get(p.clientRef) ?? null) : null,
          contractAmount: p.contractRupees != null ? BigInt(rupeesToPaise(p.contractRupees)) : null,
          stage: (p.stage as never) ?? 'ENQUIRY',
        },
      });
      if (p.ref) projectRefMap.set(p.ref, created.id);
    }

    let txnCount = 0;
    for (const t of payload.transactions ?? []) {
      await this.prisma.transaction.create({
        data: {
          type: t.type,
          category: t.category,
          amount: BigInt(rupeesToPaise(t.amountRupees)),
          date: new Date(t.date),
          projectId: t.projectRef ? (projectRefMap.get(t.projectRef) ?? null) : null,
          incomeStatus: t.type === 'INCOME' ? (t.incomeStatus ?? 'RECEIVED') : null,
          source: 'import',
          createdBy: actor.id,
        },
      });
      txnCount++;
    }

    await this.audit.log({
      actorId: actor.id,
      action: 'CREATE',
      entity: 'Import',
      after: {
        clients: payload.clients?.length ?? 0,
        projects: payload.projects?.length ?? 0,
        transactions: txnCount,
      },
    });

    return {
      imported: {
        clients: payload.clients?.length ?? 0,
        staff: payload.staff?.length ?? 0,
        projects: payload.projects?.length ?? 0,
        transactions: txnCount,
      },
      reconcile: this.reconcile(payload, projectRefMap),
    };
  }

  /** Compare imported per-project totals against the prototype's recorded balances. */
  private reconcile(payload: ImportPayload, projectRefMap: Map<string, string>) {
    const report: Array<{ projectRef: string; field: string; expected: number; imported: number; match: boolean }> = [];
    if (!payload.expectedBalances) return report;

    const totals = new Map<string, { income: number; expense: number }>();
    for (const t of payload.transactions ?? []) {
      if (!t.projectRef) continue;
      const cur = totals.get(t.projectRef) ?? { income: 0, expense: 0 };
      if (t.type === 'INCOME') cur.income += rupeesToPaise(t.amountRupees);
      else cur.expense += rupeesToPaise(t.amountRupees);
      totals.set(t.projectRef, cur);
    }

    for (const [ref, expected] of Object.entries(payload.expectedBalances)) {
      const imported = totals.get(ref) ?? { income: 0, expense: 0 };
      if (expected.incomeRupees != null) {
        const exp = rupeesToPaise(expected.incomeRupees);
        report.push({ projectRef: ref, field: 'income', expected: exp, imported: imported.income, match: exp === imported.income });
      }
      if (expected.expenseRupees != null) {
        const exp = rupeesToPaise(expected.expenseRupees);
        report.push({ projectRef: ref, field: 'expense', expected: exp, imported: imported.expense, match: exp === imported.expense });
      }
      void projectRefMap;
    }
    return report;
  }
}
